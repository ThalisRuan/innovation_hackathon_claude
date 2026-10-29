import { summarizeDay, type DaySummary, type Settings } from "./day";
import type { Entry } from "./storage";

export type WeekDay = DaySummary & { date: Date };

export type WeekSummary = {
  days: WeekDay[]; // Monday to Sunday
  deliveredMinutes: number;
  fullDays: number;
  backToYouMinutes: number; // on full days, from "done" to the usual end time
  moreWorkMinutes: number; // pre-AI work logged after a day was already done
  aiSavedMinutes: number; // only where the user said how long the task really took
};

function startOfWeek(now: Date): Date {
  const daysSinceMonday = (now.getDay() + 6) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
}

export function summarizeWeek(entries: Entry[], settings: Settings, now = new Date()): WeekSummary {
  const monday = startOfWeek(now);
  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return { ...summarizeDay(entries, settings, date), date };
  });

  const nextMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
  const inWeek = entries.filter((e) => {
    const t = new Date(e.createdAt);
    return t >= monday && t < nextMonday;
  });

  return {
    days,
    deliveredMinutes: days.reduce((sum, d) => sum + d.deliveredMinutes, 0),
    fullDays: days.filter((d) => d.done).length,
    backToYouMinutes: days.reduce((sum, d) => sum + d.timeBackMinutes, 0),
    moreWorkMinutes: days.reduce((sum, d) => sum + d.afterDoneMinutes, 0),
    aiSavedMinutes: inWeek.reduce(
      (sum, e) => sum + (e.actualMinutes === null ? 0 : Math.max(0, e.preAiMinutes - e.actualMinutes)),
      0,
    ),
  };
}
