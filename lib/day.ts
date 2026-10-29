import type { Entry } from "./storage";

export type Settings = {
  targetMinutes: number; // a full day of pre-AI work; a ceiling, not a goal
  endTime: string; // usual end of the working day, "HH:MM" local time
};

export const DEFAULT_SETTINGS: Settings = { targetMinutes: 480, endTime: "18:00" };

export type DaySummary = {
  deliveredMinutes: number;
  progress: number; // 0..1
  done: boolean;
  doneAt: Date | null;
  timeBackMinutes: number; // from doneAt to the usual end time
  afterDoneMinutes: number; // pre-AI work logged after the day was already done
};

function endOfWorkday(day: Date, endTime: string): Date {
  const [h, m] = endTime.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
}

export function summarizeDay(entries: Entry[], settings: Settings, now = new Date()): DaySummary {
  const today = entries
    .filter((e) => new Date(e.createdAt).toDateString() === now.toDateString())
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  let running = 0;
  let doneAt: Date | null = null;
  let afterDoneMinutes = 0;

  for (const e of today) {
    if (doneAt) {
      afterDoneMinutes += e.preAiMinutes;
    } else {
      running += e.preAiMinutes;
      if (running >= settings.targetMinutes) doneAt = new Date(e.createdAt);
    }
  }

  const deliveredMinutes = running + afterDoneMinutes;
  const timeBackMinutes = doneAt
    ? Math.max(0, Math.round((endOfWorkday(doneAt, settings.endTime).getTime() - doneAt.getTime()) / 60000))
    : 0;

  return {
    deliveredMinutes,
    progress: Math.min(1, deliveredMinutes / settings.targetMinutes),
    done: doneAt !== null,
    doneAt,
    timeBackMinutes,
    afterDoneMinutes,
  };
}
