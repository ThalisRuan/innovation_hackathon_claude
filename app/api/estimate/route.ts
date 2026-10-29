import Anthropic from "@anthropic-ai/sdk";
import { buildUserMessage, parseEstimate, parseRequest, SYSTEM_PROMPT } from "../../../lib/estimate";
import { isRateLimited } from "../../../lib/rateLimit";

const MODEL = "claude-haiku-5-5";

export const maxDuration = 30;

// One line of up to 300 characters fits easily in 2 KB.
const MAX_BODY_BYTES = 2048;

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

// Vercel sets x-real-ip itself; x-forwarded-for is only a fallback for local dev.
function clientKey(request: Request): string {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

// Browsers send Origin on cross-site requests; only our own pages may spend the Claude budget.
function isOtherSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("host") ?? new URL(request.url).host;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return error(500, "The estimate service is not configured.");
  }

  if (isOtherSite(request)) {
    return error(403, "This endpoint only accepts requests from Day Done.");
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return error(415, "Send JSON.");
  }

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return error(413, "Send one line describing a task you finished.");
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return error(413, "Send one line describing a task you finished.");
    }
    body = JSON.parse(raw);
  } catch {
    return error(400, "Send one line describing a task you finished.");
  }

  const input = parseRequest(body);
  if (!input.ok) {
    return error(400, "Send one line (up to 300 characters) describing a task you finished.");
  }

  if (isRateLimited(clientKey(request))) {
    return error(429, "Too many estimates in a short time. Try again in a few minutes.");
  }

  try {
    const client = new Anthropic({ timeout: 15_000, maxRetries: 1 });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(input.value) }],
    });

    const text = message.content.map((block) => (block.type === "text" ? block.text : "")).join("");
    const estimate = parseEstimate(text);
    if (!estimate) {
      return error(502, "Claude could not estimate this task. You can enter the minutes yourself.");
    }
    return Response.json(estimate);
  } catch (err) {
    const { status, message } = err as { status?: number; message?: string };
    console.error("Estimate request failed", { status, message });
    return error(502, "Could not reach Claude right now. You can enter the minutes yourself.");
  }
}
