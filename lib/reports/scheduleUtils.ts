import {
  addMonths,
  endOfMonth,
  getDate,
  setDate,
  setHours,
  setMinutes,
  setSeconds,
  startOfMonth,
  subMonths,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export function getPreviousCalendarMonthRangeInTimeZone(
  timezone: string,
  referenceUtc: Date = new Date()
): { start: Date; end: Date } {
  const zonedNow = toZonedTime(referenceUtc, timezone);
  const firstThisMonth = startOfMonth(zonedNow);
  const firstPrevMonth = subMonths(firstThisMonth, 1);
  const lastPrevMonth = endOfMonth(firstPrevMonth);

  const startLocal = setSeconds(setMinutes(setHours(firstPrevMonth, 0), 0), 0);
  const endLocal = setSeconds(setMinutes(setHours(lastPrevMonth, 23), 59), 59);

  return {
    start: fromZonedTime(startLocal, timezone),
    end: fromZonedTime(endLocal, timezone),
  };
}

export function parseLocalTimeHHmm(time: string): { h: number; m: number } {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr || "9", 10);
  const m = parseInt(mStr || "0", 10);
  return { h, m };
}

/** Next occurrence of day-of-month at local time in timezone, strictly after `afterUtc`. */
export function computeNextMonthlyRunUtc(params: {
  timezone: string;
  dayOfMonth: number;
  sendTimeLocal: string;
  afterUtc?: Date;
}): Date {
  const { timezone, dayOfMonth, sendTimeLocal } = params;
  const afterUtc = params.afterUtc ?? new Date();
  const { h, m } = parseLocalTimeHHmm(sendTimeLocal);

  const zonedAfter = toZonedTime(afterUtc, timezone);
  let monthCursor = startOfMonth(zonedAfter);

  for (let i = 0; i < 36; i++) {
    const lastDay = getDate(endOfMonth(monthCursor));
    const safeDay = Math.min(Math.max(dayOfMonth, 1), lastDay);
    let candidate = setDate(monthCursor, safeDay);
    candidate = setSeconds(setMinutes(setHours(candidate, h), m), 0);

    if (candidate > zonedAfter) {
      return fromZonedTime(candidate, timezone);
    }

    monthCursor = startOfMonth(addMonths(monthCursor, 1));
  }

  throw new Error("Unable to compute next monthly run");
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
