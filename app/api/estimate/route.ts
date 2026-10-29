import Anthropic from "@anthropic-ai/sdk";
import { buildUserMessage, parseEstimate, parseRequest, SYSTEM_PROMPT } from "../../../lib/estimate";
import { isRateLimited } from "../../../lib/rateLimit";

const MODEL = "claude-haiku-5-5";

export const maxDuration = 30;

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

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return error(500, "The estimate service is not configured.");
  }

  let body: unknown;
  try {
    body = await request.json();
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
    console.error("Estimate request failed", err);
    return error(502, "Could not reach Claude right now. You can enter the minutes yourself.");
  }
}
