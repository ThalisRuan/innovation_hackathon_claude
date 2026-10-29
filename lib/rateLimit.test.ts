import { beforeEach, describe, expect, it } from "vitest";
import { isRateLimited, resetRateLimit } from "./rateLimit";

const MINUTE = 60 * 1000;

describe("isRateLimited", () => {
  beforeEach(() => resetRateLimit());

  it("allows 20 requests per visitor in 10 minutes, then blocks", () => {
    for (let i = 0; i < 20; i++) expect(isRateLimited("a", i)).toBe(false);
    expect(isRateLimited("a", 20)).toBe(true);
    expect(isRateLimited("b", 20)).toBe(false);
  });

  it("allows the visitor again once the 10-minute window has passed", () => {
    for (let i = 0; i < 20; i++) isRateLimited("a", 0);
    expect(isRateLimited("a", 9 * MINUTE)).toBe(true);
    expect(isRateLimited("a", 10 * MINUTE)).toBe(false);
  });

  it("forgets expired visitors when many are tracked, without losing active limits", () => {
    for (let i = 0; i < 20; i++) isRateLimited("busy", 10 * MINUTE);
    for (let i = 0; i < 1001; i++) isRateLimited(`old-${i}`, 0);

    // Triggers cleanup: old visitors expired, the busy one is still inside its window.
    expect(isRateLimited("busy", 11 * MINUTE)).toBe(true);
    expect(isRateLimited("old-0", 11 * MINUTE)).toBe(false);
  });
});
