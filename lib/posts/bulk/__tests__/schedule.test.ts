import test from "node:test";
import assert from "node:assert/strict";
import { buildScheduledDates } from "@/lib/posts/bulk/schedule";

test("buildScheduledDates applies same time for all days", () => {
  const dates = buildScheduledDates({
    locationId: "loc_1",
    startDate: "2026-04-01",
    timeOfDay: "09:30",
    count: 3,
    cadence: "DAILY",
  });

  assert.equal(dates.length, 3);
  assert.equal(dates[0].getHours(), 9);
  assert.equal(dates[1].getHours(), 9);
  assert.equal(dates[2].getHours(), 9);
  assert.equal(dates[0].getMinutes(), 30);
  assert.equal(dates[1].getDate(), dates[0].getDate() + 1);
});

test("buildScheduledDates throws for invalid time format", () => {
  assert.throws(
    () =>
      buildScheduledDates({
        locationId: "loc_1",
        startDate: "2026-04-01",
        timeOfDay: "9AM",
        count: 1,
      }),
    /Invalid timeOfDay format/,
  );
});

test("buildScheduledDates honors explicit timezone", () => {
  const dates = buildScheduledDates({
    locationId: "loc_1",
    startDate: "2026-04-01",
    timeOfDay: "09:00",
    count: 1,
    timezone: "Asia/Kolkata",
  });

  assert.equal(dates.length, 1);
  assert.equal(dates[0].toISOString(), "2026-04-01T03:30:00.000Z");
});
