import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

const { POST } = await import("./route");
const { resetRateLimit } = await import("../../../lib/rateLimit");

function request(body: unknown, ip = "1.2.3.4") {
  return new Request("http://localhost/api/estimate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function claudeSays(text: string) {
  create.mockResolvedValueOnce({ content: [{ type: "text", text }] });
}

describe("POST /api/estimate", () => {
  beforeEach(() => {
    create.mockReset();
    resetRateLimit();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("returns Claude's pre-AI estimate for a one-line task", async () => {
    claudeSays('{"preAiMinutes": 150, "actualMinutes": 25, "reason": "Long-form copy takes hours."}');

    const res = await POST(request({ text: "Wrote landing page copy, took 25 min" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ preAiMinutes: 150, actualMinutes: 25, reason: "Long-form copy takes hours." });
    expect(create).toHaveBeenCalledOnce();
    expect(JSON.stringify(create.mock.calls[0][0].messages)).toContain("Wrote landing page copy");
  });

  it("rejects bad input without calling Claude", async () => {
    expect((await POST(request({ text: "" }))).status).toBe(400);
    expect((await POST(request("not json"))).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 502 when Claude's answer cannot be used", async () => {
    claudeSays("Sorry, I can't help with that.");
    const res = await POST(request({ text: "Something" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBeTruthy();
  });

  it("returns 502 when the Claude call fails", async () => {
    create.mockRejectedValueOnce(new Error("network down"));
    const res = await POST(request({ text: "Something" }));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("network down");
  });

  it("rejects calls from other websites without calling Claude", async () => {
    const res = await POST(
      new Request("http://localhost/api/estimate", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://evil.example" },
        body: JSON.stringify({ text: "Something" }),
      }),
    );
    expect(res.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it("accepts calls from its own site", async () => {
    claudeSays('{"preAiMinutes": 30, "actualMinutes": null, "reason": "Quick."}');
    const res = await POST(
      new Request("http://localhost/api/estimate", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost" },
        body: JSON.stringify({ text: "Something" }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it("rejects non-JSON and oversized bodies without calling Claude", async () => {
    const plain = new Request("http://localhost/api/estimate", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ text: "Something" }),
    });
    expect((await POST(plain)).status).toBe(415);
    expect((await POST(request({ text: "x".repeat(5000) }))).status).toBe(413);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 500 when the API key is not configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await POST(request({ text: "Something" }));
    expect(res.status).toBe(500);
    expect(create).not.toHaveBeenCalled();
  });

  it("rate limits one visitor after 20 estimates in 10 minutes", async () => {
    for (let i = 0; i < 20; i++) {
      claudeSays('{"preAiMinutes": 30, "actualMinutes": null, "reason": "Quick."}');
      expect((await POST(request({ text: `Task ${i}` }))).status).toBe(200);
    }
    expect((await POST(request({ text: "One more" }))).status).toBe(429);
    claudeSays('{"preAiMinutes": 30, "actualMinutes": null, "reason": "Quick."}');
    expect((await POST(request({ text: "Other visitor" }, "5.6.7.8"))).status).toBe(200);
  });
});
