"use client";

import { useEffect, useState, type FormEvent } from "react";
import { loadEntries, saveEntries, type Entry } from "../lib/storage";

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function isToday(iso: string, now = new Date()): boolean {
  return new Date(iso).toDateString() === now.toDateString();
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEntries(loadEntries(window.localStorage));
  }, []);

  function update(change: (current: Entry[]) => Entry[]) {
    setEntries((current) => {
      const next = change(current);
      saveEntries(next, window.localStorage);
      return next;
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const line = text.trim();
    if (!line || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: line }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      update((current) => [
        {
          id: crypto.randomUUID(),
          text: line,
          preAiMinutes: data.preAiMinutes,
          actualMinutes: data.actualMinutes,
          reason: data.reason,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setText("");
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  const today = entries.filter((e) => isToday(e.createdAt));
  const deliveredToday = today.reduce((sum, e) => sum + e.preAiMinutes, 0);

  return (
    <main className="mx-auto max-w-xl px-4 py-12 font-sans">
      <h1 className="text-3xl font-semibold tracking-tight">Day Done</h1>
      <p className="mt-2 text-neutral-500">
        You&apos;ve already worked a full day. AI just made it shorter.
      </p>

      <form onSubmit={onSubmit} className="mt-8">
        <label htmlFor="task" className="block text-sm font-medium">
          What did you just finish?
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="task"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={300}
            placeholder="Wrote the landing page copy for Acme, took 25 min"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="rounded-lg bg-foreground px-4 py-2 text-background disabled:opacity-40"
          >
            {loading ? "Estimating…" : "Log"}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </form>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-neutral-500">
          Today: {formatMinutes(deliveredToday)} of pre-AI work delivered
        </h2>
        {today.length === 0 ? (
          <p className="mt-4 text-neutral-500">Nothing logged today yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
            {today.map((e) => (
              <li key={e.id} className="py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span>{e.text}</span>
                  <span className="shrink-0 font-medium">{formatMinutes(e.preAiMinutes)}</span>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  {e.reason}
                  {e.actualMinutes !== null && ` You spent ${formatMinutes(e.actualMinutes)}.`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
