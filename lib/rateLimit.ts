// Best-effort, in-memory limiter. On Vercel each server instance keeps its own
// counts and they reset on cold starts, so this only slows casual abuse.
// The real cost backstop is a monthly spend limit on the Anthropic workspace.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;

const hits = new Map<string, number[]>();

function prune(now: number) {
  for (const [key, times] of hits) {
    if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
  }
}

export function isRateLimited(key: string, now = Date.now()): boolean {
  if (hits.size > 1000) prune(now);

  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

export function resetRateLimit() {
  hits.clear();
}
