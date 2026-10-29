"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DEFAULT_SETTINGS, summarizeDay, type Settings } from "../lib/day";
import { loadEntries, loadSettings, saveEntries, saveSettings, type Entry } from "../lib/storage";

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function isToday(iso: string, now = new Date()): boolean {
  return new Date(iso).toDateString() === now.toDateString();
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setEntries(loadEntries(window.localStorage));
    setSettings(loadSettings(window.localStorage));
  }, []);

  function changeSettings(next: Settings) {
    setSettings(next);
    saveSettings(next, window.localStorage);
  }

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
  const day = summarizeDay(entries, settings);

  return (
    <main className="mx-auto max-w-xl px-4 py-12 font-sans">
      <h1 className="text-3xl font-semibold tracking-tight">Day Done</h1>
      <p className="mt-2 text-neutral-500">
        You&apos;ve already worked a full day. AI just made it shorter.
      </p>

      <section className="mt-8" aria-live="polite">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">{formatMinutes(day.deliveredMinutes)} of pre-AI work delivered</span>
          <span className="text-neutral-500">a full day is {formatMinutes(settings.targetMinutes)}</span>
        </div>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={settings.targetMinutes}
          aria-valuenow={Math.min(day.deliveredMinutes, settings.targetMinutes)}
          aria-label="Pre-AI work delivered today"
        >
          <div
            className={`h-full rounded-full transition-all ${day.done ? "bg-emerald-500" : "bg-foreground"}`}
            style={{ width: `${day.progress * 100}%` }}
          />
        </div>

        {day.done && day.doneAt && (
          <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5">
            <p className="text-xl font-semibold">Day done.</p>
            <p className="mt-1">
              You delivered a full day of work by {formatClock(day.doneAt)}.
              {day.timeBackMinutes > 0
                ? ` The rest of the day is yours: ${formatMinutes(day.timeBackMinutes)} back to you.`
                : " Time to stop for today."}
            </p>
            {day.afterDoneMinutes > 0 && (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Since then you logged {formatMinutes(day.afterDoneMinutes)} more. That time went to more work, not
                back to you.
              </p>
            )}
          </div>
        )}
      </section>

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
        <h2 className="text-sm font-medium text-neutral-500">Finished today</h2>
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

      <details className="mt-10 text-sm">
        <summary className="cursor-pointer text-neutral-500">Settings</summary>
        <div className="mt-3 flex flex-wrap gap-6">
          <label className="flex items-center gap-2">
            A full day is
            <select
              value={settings.targetMinutes}
              onChange={(e) => changeSettings({ ...settings, targetMinutes: Number(e.target.value) })}
              className="rounded border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
            >
              {[4, 5, 6, 7, 8].map((h) => (
                <option key={h} value={h * 60}>
                  {h} hours
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            I usually stop at
            <input
              type="time"
              value={settings.endTime}
              onChange={(e) => e.target.value && changeSettings({ ...settings, endTime: e.target.value })}
              className="rounded border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700"
            />
          </label>
        </div>
      </details>
    </main>
  );
}
