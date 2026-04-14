import * as dotenv from "dotenv";
dotenv.config();
import { Queue } from "bullmq";
import { connection } from "./queue";

/** BullMQ queue for automated GMB PDF report generation + email delivery */
export const reportQueue = new Queue("gmb-reports", {
  connection,
});

export interface ReportJobData {
  reportId: string;
  locationId: string;
  userId: string;
  scheduleId?: string;
  /** ISO strings */
  startDate: string;
  endDate: string;
  recipientEmail: string;
}

export interface ReportScheduleTriggerJobData {
  scheduleId: string;
}

function getScheduleTriggerJobId(scheduleId: string): string {
  return `report-schedule-trigger-${scheduleId}`;
}

export async function enqueueReportJob(
  data: ReportJobData,
  opts?: { jobId?: string; delay?: number }
): Promise<void> {
  await reportQueue.add("generate-report", data, {
    jobId: opts?.jobId,
    delay: opts?.delay,
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: { type: "exponential", delay: 60_000 },
  });
}

export async function upsertReportScheduleTriggerJob(params: {
  scheduleId: string;
  nextRunAt: Date;
}): Promise<void> {
  const { scheduleId, nextRunAt } = params;
  const delay = Math.max(0, nextRunAt.getTime() - Date.now());
  const jobId = getScheduleTriggerJobId(scheduleId);

  await reportQueue.remove(jobId);

  await reportQueue.add(
    "schedule-trigger",
    { scheduleId } satisfies ReportScheduleTriggerJobData,
    {
      jobId,
      delay,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
    }
  );
}

export async function removeReportScheduleTriggerJob(
  scheduleId: string
): Promise<void> {
  await reportQueue.remove(getScheduleTriggerJobId(scheduleId));
}
