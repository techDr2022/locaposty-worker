import { Worker, Job } from "bullmq";
import { format } from "date-fns";
import { prisma } from "../prisma";
import { connection } from "../queue";
import {
  enqueueReportJob,
  removeReportScheduleTriggerJob,
  upsertReportScheduleTriggerJob,
  type ReportJobData,
  type ReportScheduleTriggerJobData,
} from "../reportQueue";
import { buildReportDataForLocation } from "../reports/buildReportData";
import {
  renderPerformanceReportHtml,
  type PerformanceDataItem,
  type ReviewDataForPdf,
  type SearchKeywordForPdf,
} from "../reports/renderPerformanceReportHtml";
import { renderHtmlToPdfBuffer } from "../reports/renderReportPdf";
import {
  computeNextMonthlyRunUtc,
  getPreviousCalendarMonthRangeInTimeZone,
} from "../reports/scheduleUtils";
import { uploadBufferToS3 } from "../s3";
import { sendReportEmailWithPdf } from "../sendReportEmail";
import {
  ReportType,
  SubscriptionPlan,
  SubscriptionStatus,
} from "../generated/prisma/index.js";

async function processScheduleTriggerJob(
  job: Job<ReportScheduleTriggerJobData>
): Promise<void> {
  const { scheduleId } = job.data;
  console.log(
    `[reports-worker] schedule-trigger start job=${job.id} scheduleId=${scheduleId}`
  );

  const schedule = await prisma.reportSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      location: {
        select: {
          id: true,
          timezone: true,
          reportEmail: true,
          users: { select: { id: true }, take: 1 },
        },
      },
    },
  });

  if (!schedule || !schedule.enabled || !schedule.nextRunAt) {
    await removeReportScheduleTriggerJob(scheduleId);
    return;
  }

  const now = new Date();
  if (schedule.nextRunAt.getTime() > now.getTime()) {
    await upsertReportScheduleTriggerJob({
      scheduleId: schedule.id,
      nextRunAt: schedule.nextRunAt,
    });
    return;
  }

  const location = schedule.location;
  const ownerId = location.users[0]?.id;
  const timezone = location.timezone || schedule.timezone || "UTC";
  const recipientEmail = location.reportEmail;

  if (!recipientEmail || !ownerId) {
    if (schedule.type === "MONTHLY") {
      const next = computeNextMonthlyRunUtc({
        timezone: schedule.timezone,
        dayOfMonth: schedule.dayOfMonth ?? 5,
        sendTimeLocal: schedule.sendTimeLocal ?? "09:00",
        afterUtc: now,
      });

      await prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: { nextRunAt: next },
      });

      await upsertReportScheduleTriggerJob({
        scheduleId: schedule.id,
        nextRunAt: next,
      });
    } else {
      await prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: { enabled: false, nextRunAt: null },
      });
      await removeReportScheduleTriggerJob(schedule.id);
    }
    return;
  }

  if (schedule.type === "MONTHLY") {
    const { start, end } = getPreviousCalendarMonthRangeInTimeZone(
      timezone,
      schedule.nextRunAt
    );

    const report = await prisma.report.create({
      data: {
        locationId: location.id,
        scheduleId: schedule.id,
        name: `Monthly report ${start.toISOString().slice(0, 7)}`,
        startDate: start,
        endDate: end,
        reportType: ReportType.MONTHLY,
        reportPeriodStart: start,
        reportPeriodEnd: end,
        recipientEmail,
        scheduledFor: schedule.nextRunAt,
        status: "GENERATING",
      },
    });

    await enqueueReportJob(
      {
        reportId: report.id,
        locationId: location.id,
        userId: ownerId,
        scheduleId: schedule.id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        recipientEmail,
      },
      { jobId: `report-${location.id}-${start.toISOString().slice(0, 7)}` }
    );

    const next = computeNextMonthlyRunUtc({
      timezone: schedule.timezone,
      dayOfMonth: schedule.dayOfMonth ?? 5,
      sendTimeLocal: schedule.sendTimeLocal ?? "09:00",
      afterUtc: now,
    });

    await prisma.reportSchedule.update({
      where: { id: schedule.id },
      data: { lastRunAt: now, nextRunAt: next },
    });

    await upsertReportScheduleTriggerJob({
      scheduleId: schedule.id,
      nextRunAt: next,
    });
    return;
  }

  if (schedule.type === "CUSTOM" && schedule.runAt) {
    const useCustomRange =
      schedule.customPeriodType === "CUSTOM_RANGE" &&
      schedule.customStartDate != null &&
      schedule.customEndDate != null;

    const { start, end } = useCustomRange
      ? {
          start: schedule.customStartDate as Date,
          end: schedule.customEndDate as Date,
        }
      : getPreviousCalendarMonthRangeInTimeZone(timezone, schedule.runAt);

    const reportName = useCustomRange
      ? `Custom range report ${format(start, "yyyy-MM-dd")} to ${format(end, "yyyy-MM-dd")}`
      : `Custom scheduled report ${format(start, "yyyy-MM")}`;

    const report = await prisma.report.create({
      data: {
        locationId: location.id,
        scheduleId: schedule.id,
        name: reportName,
        startDate: start,
        endDate: end,
        reportType: ReportType.CUSTOM,
        reportPeriodStart: start,
        reportPeriodEnd: end,
        recipientEmail,
        scheduledFor: schedule.runAt,
        status: "GENERATING",
      },
    });

    await enqueueReportJob(
      {
        reportId: report.id,
        locationId: location.id,
        userId: ownerId,
        scheduleId: schedule.id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        recipientEmail,
      },
      {
        jobId: `report-${location.id}-custom-${schedule.id}-${schedule.runAt.getTime()}`,
      }
    );

    await prisma.reportSchedule.update({
      where: { id: schedule.id },
      data: { enabled: false, lastRunAt: now, nextRunAt: null },
    });
    await removeReportScheduleTriggerJob(schedule.id);
  }
}

async function processReportJob(job: Job<ReportJobData>): Promise<void> {
  const {
    reportId,
    locationId,
    userId,
    scheduleId,
    startDate,
    endDate,
    recipientEmail,
  } = job.data;

  const start = new Date(startDate);
  const end = new Date(endDate);

  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: "GENERATING",
      attemptCount: { increment: 1 },
      errorMessage: null,
    },
  });

  try {
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        users: { some: { id: userId } },
      },
      select: {
        name: true,
        gmbLocationName: true,
        address: true,
        logoUrl: true,
      },
    });

    const locationName =
      location?.gmbLocationName || location?.name || "Location";
    const locationAddress = location?.address || "";
    const locationLogoUrl = location?.logoUrl || undefined;

    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.CANCELED,
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        plan: true,
        status: true,
        currentPeriodEnd: true,
      },
    });

    const hasCanceledAccess =
      activeSubscription?.status === SubscriptionStatus.CANCELED &&
      !!activeSubscription.currentPeriodEnd &&
      new Date() <= new Date(activeSubscription.currentPeriodEnd);

    const canUseWhiteLabel =
      (activeSubscription?.status === SubscriptionStatus.ACTIVE ||
        activeSubscription?.status === SubscriptionStatus.TRIALING ||
        hasCanceledAccess) &&
      (activeSubscription?.plan === SubscriptionPlan.PREMIUM ||
        activeSubscription?.plan === SubscriptionPlan.ENTERPRISE);

    const userBranding = canUseWhiteLabel
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: {
            reportBrandName: true,
            reportBrandLogoUrl: true,
          },
        })
      : null;

    const { performanceData, reviewData, searchKeywords } =
      await buildReportDataForLocation(locationId, start, end);

    const html = renderPerformanceReportHtml({
      performanceData: performanceData as unknown as PerformanceDataItem[],
      reviewData: { summary: reviewData.summary } as ReviewDataForPdf,
      searchKeywords: searchKeywords as SearchKeywordForPdf[],
      locationName,
      locationAddress,
      locationLogoUrl,
      startDate: start,
      endDate: end,
      brandName: userBranding?.reportBrandName || undefined,
      brandLogoUrl: userBranding?.reportBrandLogoUrl || undefined,
    });

    const pdfBuffer = await renderHtmlToPdfBuffer(html);
    const safeLoc = locationName.replace(/[^a-zA-Z0-9-_]/g, "-");
    const key = `reports/${locationId}/${format(start, "yyyy-MM")}-${Date.now()}-${safeLoc}.pdf`;
    const fileUrl = await uploadBufferToS3(pdfBuffer, key, "application/pdf");

    const emailResult = await sendReportEmailWithPdf({
      to: recipientEmail,
      subject: `LocaPosty performance report (${format(start, "MMM yyyy")})`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px;">
          <p>Hi,</p>
          <p>Your Google Business Profile performance report for <strong>${locationName}</strong> is ready.</p>
          <p><strong>Period:</strong> ${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}</p>
          <p>The PDF is attached to this email. You can also open it from your LocaPosty dashboard.</p>
          <p style="color:#64748b;font-size:12px;">Sent automatically by LocaPosty report automation.</p>
        </div>
      `,
      pdfBuffer,
      filename: `performance-report-${format(start, "yyyy-MM-dd")}-to-${format(end, "yyyy-MM-dd")}.pdf`,
    });

    if (!emailResult.ok) {
      throw new Error(emailResult.error || "Failed to send email");
    }

    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: "COMPLETED",
        fileUrl,
        deliveredAt: new Date(),
        errorMessage: null,
      },
    });

    if (scheduleId) {
      await prisma.reportSchedule.update({
        where: { id: scheduleId },
        data: { lastRunAt: new Date() },
      });
    }
    console.log(
      `[reports-worker] generate-report success reportId=${reportId} deliveredTo=${recipientEmail}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.report.update({
      where: { id: reportId },
      data: { status: "FAILED", errorMessage: message },
    });
    console.error(
      `[reports-worker] generate-report failed reportId=${reportId}: ${message}`
    );
    throw err;
  }
}

export async function reconcileScheduleTriggers(): Promise<void> {
  const schedules = await prisma.reportSchedule.findMany({
    where: { enabled: true, nextRunAt: { not: null } },
    select: { id: true, nextRunAt: true },
  });

  for (const schedule of schedules) {
    if (!schedule.nextRunAt) continue;
    await upsertReportScheduleTriggerJob({
      scheduleId: schedule.id,
      nextRunAt: schedule.nextRunAt,
    });
  }

  console.log(
    `[reports-worker] Reconciled ${schedules.length} active schedule trigger jobs`
  );
}

export function createReportWorker(): Worker<
  ReportJobData | ReportScheduleTriggerJobData
> {
  const worker = new Worker<ReportJobData | ReportScheduleTriggerJobData>(
    "gmb-reports",
    async (job) => {
      const payload = job.data as Partial<
        ReportJobData & ReportScheduleTriggerJobData
      >;
      const looksLikeScheduleTrigger =
        typeof payload.scheduleId === "string" &&
        (!("reportId" in payload) || !payload.reportId);

      if (job.name === "schedule-trigger" || looksLikeScheduleTrigger) {
        await processScheduleTriggerJob(job as Job<ReportScheduleTriggerJobData>);
        return;
      }

      if (job.name === "generate-report") {
        await processReportJob(job as Job<ReportJobData>);
        return;
      }

      throw new Error(`Unknown report job type: ${job.name}`);
    },
    { connection, concurrency: 2 }
  );

  worker.on("completed", (j) =>
    console.log(`[reports-worker] Job ${j.id} completed`)
  );
  worker.on("failed", (j, err) =>
    console.error(`[reports-worker] Job ${j?.id} failed:`, err.message)
  );

  return worker;
}
