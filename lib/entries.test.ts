import { describe, expect, it } from "vitest";
import { createManualEntry, parseMinutesInput, setEntryMinutes } from "./entries";
import type { Entry } from "./storage";

const base: Entry = {
  id: "a",
  text: "Logo v2",
  preAiMinutes: 120,
  actualMinutes: null,
  reason: "Logo work takes a couple of hours.",
  createdAt: "2026-10-29T10:00:00.000Z",
};

describe("parseMinutesInput", () => {
  it("understands plain minutes and hour formats", () => {
    expect(parseMinutesInput("90")).toBe(90);
    expect(parseMinutesInput("2h")).toBe(120);
    expect(parseMinutesInput("1h30")).toBe(90);
    expect(parseMinutesInput(" 1h 30m ")).toBe(90);
    expect(parseMinutesInput("45min")).toBe(45);
    expect(parseMinutesInput("1.5h")).toBe(90);
    expect(parseMinutesInput("1:15")).toBe(75);
  });

  it("rejects empty, zero, nonsense or more than a full day", () => {
    for (const bad of ["", "0", "abc", "-30", "17h", "1h75"]) {
      expect(parseMinutesInput(bad)).toBeNull();
    }
  });
});

describe("setEntryMinutes", () => {
  it("changes only the chosen entry and marks it as the user's own estimate", () => {
    const other = { ...base, id: "b" };
    const result = setEntryMinutes([base, other], "a", 90);
    expect(result[0]).toEqual({ ...base, preAiMinutes: 90, edited: true });
    expect(result[1]).toBe(other);
  });
});

describe("createManualEntry", () => {
  it("creates an entry the user estimated themselves", () => {
    const now = new Date("2026-10-29T15:00:00.000Z");
    const entry = createManualEntry("Client call prep", 60, now);
    expect(entry).toMatchObject({
      text: "Client call prep",
      preAiMinutes: 60,
      actualMinutes: null,
      edited: true,
      createdAt: "2026-10-29T15:00:00.000Z",
    });
    expect(entry.reason).toMatch(/you/i);
    expect(entry.id).toBeTruthy();
  });
});
