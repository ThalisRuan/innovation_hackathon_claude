import type { Entry } from "./storage";

const MAX_MINUTES = 960;

// Accepts what people naturally type: "90", "45min", "2h", "1h30", "1.5h", "1:15".
export function parseMinutesInput(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, "");
  let minutes: number | null = null;

  let match: RegExpMatchArray | null;
  if ((match = s.match(/^(\d+)(?:m|min|mins)?$/))) {
    minutes = Number(match[1]);
  } else if ((match = s.match(/^(\d+):([0-5]\d)$/))) {
    minutes = Number(match[1]) * 60 + Number(match[2]);
  } else if ((match = s.match(/^(\d+(?:\.\d+)?)h(?:(\d{1,2})(?:m|min)?)?$/))) {
    const extra = match[2] ? Number(match[2]) : 0;
    if (extra >= 60) return null;
    minutes = Math.round(Number(match[1]) * 60) + extra;
  }

  return minutes !== null && minutes >= 1 && minutes <= MAX_MINUTES ? minutes : null;
}

export function setEntryMinutes(entries: Entry[], id: string, minutes: number): Entry[] {
  return entries.map((e) => (e.id === id ? { ...e, preAiMinutes: minutes, edited: true } : e));
}

export function createManualEntry(text: string, minutes: number, now = new Date()): Entry {
  return {
    id: crypto.randomUUID(),
    text,
    preAiMinutes: minutes,
    actualMinutes: null,
    reason: "Estimated by you.",
    edited: true,
    createdAt: now.toISOString(),
  };
}
