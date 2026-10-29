import { z } from "zod";

export type Estimate = {
  preAiMinutes: number;
  actualMinutes: number | null;
  reason: string;
};

export type EstimateRequest = { text: string; role?: string };

// One working day is the most a single finished task can count for.
const MAX_MINUTES = 960;

const requestSchema = z.object({
  text: z.string().trim().min(1).max(300),
  role: z.string().trim().max(60).optional(),
});

const estimateSchema = z.object({
  preAiMinutes: z.number().positive(),
  actualMinutes: z.number().nonnegative().max(MAX_MINUTES).nullable().optional(),
  reason: z.string().trim().min(1).max(300),
});

export const SYSTEM_PROMPT = `You help freelancers see how much work they really delivered.
The user tells you, in one line, a task they just FINISHED (usually with AI help).
Estimate how many minutes an experienced freelancer would have needed for that same task WITHOUT any AI tools.

Reply with ONLY a JSON object, no other text:
{"preAiMinutes": <integer>, "actualMinutes": <integer or null>, "reason": "<one sentence, max 20 words>"}

- preAiMinutes: realistic time without AI, between 5 and 960.
- actualMinutes: the time the user says they actually spent, converted to minutes; null if they did not say.
- reason: why that estimate, in plain words. Do not praise or encourage more work.`;

export function parseRequest(body: unknown): { ok: true; value: EstimateRequest } | { ok: false } {
  const result = requestSchema.safeParse(body);
  return result.success ? { ok: true, value: result.data } : { ok: false };
}

export function buildUserMessage({ text, role }: EstimateRequest): string {
  return role ? `My role: ${role}\nFinished task: ${text}` : `Finished task: ${text}`;
}

export function parseEstimate(raw: string): Estimate | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let json: unknown;
  try {
    json = JSON.parse(match[0]);
  } catch {
    return null;
  }

  const result = estimateSchema.safeParse(json);
  if (!result.success) return null;

  const { preAiMinutes, actualMinutes, reason } = result.data;
  return {
    preAiMinutes: Math.max(1, Math.min(MAX_MINUTES, Math.round(preAiMinutes))),
    actualMinutes: actualMinutes == null ? null : Math.round(actualMinutes),
    reason,
  };
}
