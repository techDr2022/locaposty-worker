import prisma from "@/lib/db";
import { BulkScheduleInput, ScheduleConflict } from "@/lib/posts/bulk/types";
import { fromZonedTime } from "date-fns-tz";

function parseTimeOfDay(timeOfDay: string): { hours: number; minutes: number } {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(timeOfDay);
  if (!match) {
    throw new Error("Invalid timeOfDay format. Expected HH:mm");
  }
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function parseDateOnly(startDate: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!match) {
    throw new Error("Invalid startDate format. Expected YYYY-MM-DD");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(year, month - 1, day);
  if (
    Number.isNaN(probe.getTime()) ||
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    throw new Error("Invalid startDate provided");
  }

  return { year, month, day };
}

export function buildScheduledDates(input: BulkScheduleInput): Date[] {
  const { startDate, timeOfDay, count, timezone } = input;
  if (count <= 0) {
    throw new Error("Count must be greater than 0");
  }

  const { year, month, day } = parseDateOnly(startDate);
  const { hours, minutes } = parseTimeOfDay(timeOfDay);
  const schedule: Date[] = [];

  for (let i = 0; i < count; i += 1) {
    const localDateTime = new Date(
      year,
      month - 1,
      day + i,
      hours,
      minutes,
      0,
      0,
    );
    schedule.push(
      timezone ? fromZonedTime(localDateTime, timezone) : localDateTime,
    );
  }

  return schedule;
}

export async function findScheduleConflicts(
  locationId: string,
  scheduledDates: Date[],
): Promise<ScheduleConflict[]> {
  if (scheduledDates.length === 0) return [];

  const conflicts = await prisma.post.findMany({
    where: {
      locationId,
      scheduledAt: {
        in: scheduledDates,
      },
      status: {
        in: ["SCHEDULED", "PUBLISHED", "FAILED"],
      },
    },
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      title: true,
    },
    orderBy: {
      scheduledAt: "asc",
    },
  });

  return conflicts.map((conflict) => ({
    postId: conflict.id,
    scheduledAt: conflict.scheduledAt.toISOString(),
    status: conflict.status,
    title: conflict.title,
  }));
}
