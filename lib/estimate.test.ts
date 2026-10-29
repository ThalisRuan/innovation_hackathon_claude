import { describe, expect, it } from "vitest";
import { parseEstimate, parseRequest } from "./estimate";

describe("parseRequest", () => {
  it("accepts a one-line task and trims it", () => {
    expect(parseRequest({ text: "  Wrote landing page copy, took 25 min  " })).toEqual({
      ok: true,
      value: { text: "Wrote landing page copy, took 25 min", role: undefined },
    });
  });

  it("accepts an optional role", () => {
    const result = parseRequest({ text: "Logo v2", role: "designer" });
    expect(result.ok && result.value.role).toBe("designer");
  });

  it("rejects empty, missing or too long text", () => {
    expect(parseRequest({ text: "   " }).ok).toBe(false);
    expect(parseRequest({}).ok).toBe(false);
    expect(parseRequest(null).ok).toBe(false);
    expect(parseRequest({ text: "x".repeat(301) }).ok).toBe(false);
  });
});

describe("parseEstimate", () => {
  it("reads the JSON Claude returns", () => {
    const raw = '{"preAiMinutes": 150, "actualMinutes": 25, "reason": "Copywriting from scratch takes 2-3 hours."}';
    expect(parseEstimate(raw)).toEqual({
      preAiMinutes: 150,
      actualMinutes: 25,
      reason: "Copywriting from scratch takes 2-3 hours.",
    });
  });

  it("finds the JSON when Claude wraps it in text or a code fence", () => {
    const raw = 'Here you go:\n```json\n{"preAiMinutes": 60, "actualMinutes": null, "reason": "A short email."}\n```';
    expect(parseEstimate(raw)?.preAiMinutes).toBe(60);
  });

  it("rounds minutes and keeps them within one working day", () => {
    expect(parseEstimate('{"preAiMinutes": 2000.4, "actualMinutes": null, "reason": "Big job."}')?.preAiMinutes).toBe(960);
    expect(parseEstimate('{"preAiMinutes": 12.6, "actualMinutes": 3.2, "reason": "Tiny."}')).toMatchObject({
      preAiMinutes: 13,
      actualMinutes: 3,
    });
  });

  it("never counts a task as zero minutes and rejects absurd actual times", () => {
    expect(parseEstimate('{"preAiMinutes": 0.2, "actualMinutes": null, "reason": "Trivial."}')?.preAiMinutes).toBe(1);
    expect(parseEstimate('{"preAiMinutes": 30, "actualMinutes": 1e308, "reason": "Odd."}')).toBeNull();
  });

  it("returns null for anything that is not a usable estimate", () => {
    expect(parseEstimate("I cannot estimate that.")).toBeNull();
    expect(parseEstimate('{"preAiMinutes": "lots", "reason": "?"}')).toBeNull();
    expect(parseEstimate('{"preAiMinutes": 0, "actualMinutes": null, "reason": "Nothing."}')).toBeNull();
    expect(parseEstimate('{"preAiMinutes": 30, "actualMinutes": null, "reason": ""}')).toBeNull();
  });
});
