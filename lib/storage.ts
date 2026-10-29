export type Entry = {
  id: string;
  text: string;
  preAiMinutes: number;
  actualMinutes: number | null;
  reason: string;
  createdAt: string; // ISO 8601, UTC
};

type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

const KEY = "day-done:entries";

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
