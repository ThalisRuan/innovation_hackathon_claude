import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./day";
import type { Entry } from "./storage";
import { summarizeWeek } from "./week";

// Thursday 29 Oct 2026, local time. Its week runs Mon 26 Oct to Sun 1 Nov.
const day = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m);
const thursday = day(29, 17);

let n = 0;
function entry(preAiMinutes: number, time: Date, actualMinutes: number | null = null): Entry {
  return { id: String(n++), text: "t", preAiMinutes, actualMinutes, reason: "r", createdAt: time.toISOString() };
}

describe("summarizeWeek", () => {
  it("lists Monday to Sunday with the pre-AI work delivered each day", () => {
    const week = summarizeWeek([entry(120, day(26, 10)), entry(60, day(29, 9))], DEFAULT_SETTINGS, thursday);
    expect(week.days).toHaveLength(7);
    expect(week.days[0].date.getDay()).toBe(1); // Monday
    expect(week.days.map((d) => d.deliveredMinutes)).toEqual([120, 0, 0, 60, 0, 0, 0]);
    expect(week.deliveredMinutes).toBe(180);
  });

  it("ignores entries from other weeks", () => {
    const week = summarizeWeek([entry(300, day(25, 10)), entry(60, day(27, 10))], DEFAULT_SETTINGS, thursday);
    expect(week.deliveredMinutes).toBe(60);
  });

  it("adds up time given back on full days and work done after them", () => {
    const entries = [
      entry(480, day(26, 14)), // Monday: done at 14:00, 4h back
      entry(480, day(28, 16)), // Wednesday: done at 16:00, 2h back...
      entry(90, day(28, 17)), // ...but 1h30 more work logged after
      entry(200, day(29, 10)), // Thursday: not done
    ];
    const week = summarizeWeek(entries, DEFAULT_SETTINGS, thursday);
    expect(week.fullDays).toBe(2);
    expect(week.backToYouMinutes).toBe(6 * 60);
    expect(week.moreWorkMinutes).toBe(90);
  });

  it("counts AI time saved only where the user said how long it took", () => {
    const entries = [entry(150, day(27, 10), 25), entry(60, day(27, 11), 90), entry(120, day(27, 12))];
    const week = summarizeWeek(entries, DEFAULT_SETTINGS, thursday);
    expect(week.aiSavedMinutes).toBe(125); // 150-25; a task that took longer than estimated saves nothing
  });
});
