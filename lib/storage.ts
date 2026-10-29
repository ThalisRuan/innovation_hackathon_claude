import { DEFAULT_SETTINGS, type Settings } from "./day";

export type Entry = {
  id: string;
  text: string;
  preAiMinutes: number;
  actualMinutes: number | null;
  reason: string;
  edited?: boolean; // true when the minutes are the user's own estimate, not Claude's
  createdAt: string; // ISO 8601, UTC
};

type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

const KEY = "day-done:entries";
const SETTINGS_KEY = "day-done:settings";

function isEntry(value: unknown): value is Entry {
  const e = value as Entry;
  return (
    typeof e === "object" &&
    e !== null &&
    typeof e.id === "string" &&
    typeof e.text === "string" &&
    Number.isFinite(e.preAiMinutes) &&
    (e.actualMinutes === null || Number.isFinite(e.actualMinutes)) &&
    typeof e.reason === "string" &&
    (e.edited === undefined || typeof e.edited === "boolean") &&
    typeof e.createdAt === "string"
  );
}

export function loadEntries(store: KeyValueStore): Entry[] {
  try {
    const raw = store.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Drop only broken entries, so one bad record never wipes the history.
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: Entry[], store: KeyValueStore): void {
  try {
    store.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Private mode or blocked storage: the app still works for this session.
  }
}

function isSettings(value: unknown): value is Settings {
  const s = value as Settings;
  return (
    typeof s === "object" &&
    s !== null &&
    Number.isFinite(s.targetMinutes) &&
    s.targetMinutes >= 60 &&
    s.targetMinutes <= 960 &&
    typeof s.endTime === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(s.endTime)
  );
}

export function loadSettings(store: KeyValueStore): Settings {
  try {
    const parsed: unknown = JSON.parse(store.getItem(SETTINGS_KEY) ?? "null");
    return isSettings(parsed) ? parsed : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings, store: KeyValueStore): void {
  try {
    store.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Blocked storage: settings last for this session only.
  }
}
