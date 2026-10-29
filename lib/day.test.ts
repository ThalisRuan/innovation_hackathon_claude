import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, summarizeDay } from "./day";
import type { Entry } from "./storage";

// Local-time dates, so tests read like the user's own clock.
const at = (h: number, m = 0) => new Date(2026, 9, 29, h, m);

function entry(id: string, preAiMinutes: number, time: Date): Entry {
  return { id, text: id, preAiMinutes, actualMinutes: null, reason: "r", createdAt: time.toISOString() };
}

describe("summarizeDay", () => {
  it("adds up pre-AI work delivered today and shows progress toward the target", () => {
    const day = summarizeDay([entry("a", 120, at(9)), entry("b", 60, at(10))], DEFAULT_SETTINGS, at(11));
    expect(day).toMatchObject({ deliveredMinutes: 180, progress: 180 / 480, done: false, doneAt: null, timeBackMinutes: 0 });
  });

  it("ignores entries from other days", () => {
    const yesterday = new Date(2026, 9, 28, 15);
    const day = summarizeDay([entry("old", 400, yesterday), entry("a", 60, at(9))], DEFAULT_SETTINGS, at(11));
    expect(day.deliveredMinutes).toBe(60);
  });

  it("marks the day done at the task that reaches the target and gives back the rest of the day", () => {
    const entries = [entry("a", 300, at(10)), entry("b", 200, at(14, 10))];
    const day = summarizeDay(entries, DEFAULT_SETTINGS, at(14, 30));
    expect(day.done).toBe(true);
    expect(day.doneAt?.getTime()).toBe(at(14, 10).getTime());
    expect(day.timeBackMinutes).toBe(3 * 60 + 50); // 14:10 → 18:00
    expect(day.progress).toBe(1);
  });

  it("counts work logged after the day was done as going to more work", () => {
    const entries = [entry("a", 480, at(13)), entry("b", 90, at(15)), entry("c", 30, at(16))];
    const day = summarizeDay(entries, DEFAULT_SETTINGS, at(17));
    expect(day.afterDoneMinutes).toBe(120);
    expect(day.timeBackMinutes).toBe(5 * 60);
  });

  it("gives no time back when the target is reached after the usual end time", () => {
    const day = summarizeDay([entry("a", 500, at(19))], DEFAULT_SETTINGS, at(19, 30));
    expect(day.done).toBe(true);
    expect(day.timeBackMinutes).toBe(0);
  });

  it("respects custom settings", () => {
    const day = summarizeDay([entry("a", 360, at(12))], { targetMinutes: 360, endTime: "17:30" }, at(12, 5));
    expect(day.done).toBe(true);
    expect(day.timeBackMinutes).toBe(5 * 60 + 30);
  });
});
