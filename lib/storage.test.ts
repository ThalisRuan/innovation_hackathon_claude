import { beforeEach, describe, expect, it } from "vitest";
import { loadEntries, saveEntries, type Entry } from "./storage";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

const entry: Entry = {
  id: "a1",
  text: "Logo v2 sent",
  preAiMinutes: 120,
  actualMinutes: 30,
  reason: "Logo iterations take a couple of hours.",
  createdAt: "2026-10-29T10:15:00.000Z",
};

describe("storage", () => {
  let store: MemoryStorage;
  beforeEach(() => {
    store = new MemoryStorage();
  });

  it("saves and loads entries", () => {
    saveEntries([entry], store);
    expect(loadEntries(store)).toEqual([entry]);
  });

  it("returns an empty list when nothing is stored or data is corrupt", () => {
    expect(loadEntries(store)).toEqual([]);
    store.setItem("day-done:entries", "{not json");
    expect(loadEntries(store)).toEqual([]);
    store.setItem("day-done:entries", JSON.stringify([{ id: 1 }]));
    expect(loadEntries(store)).toEqual([]);
  });

  it("keeps valid entries when one stored entry is broken", () => {
    store.setItem("day-done:entries", JSON.stringify([entry, { id: 2 }, { ...entry, id: "b", preAiMinutes: null }]));
    expect(loadEntries(store)).toEqual([entry]);
  });

  it("does not throw when storage is unavailable", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadEntries(broken)).toEqual([]);
    expect(() => saveEntries([entry], broken)).not.toThrow();
  });
});
