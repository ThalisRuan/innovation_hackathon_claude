"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { DEFAULT_SETTINGS, summarizeDay, type Settings } from "../lib/day";
import { createManualEntry, parseMinutesInput, setEntryMinutes } from "../lib/entries";
import { summarizeWeek } from "../lib/week";
import { loadEntries, loadSettings, saveEntries, saveSettings, type Entry } from "../lib/storage";

type View = "today" | "week" | "settings";

const field =
  "rounded-lg border border-neutral-300 bg-transparent px-3 transition-[border-color,box-shadow] duration-150 focus-visible:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/30 dark:border-neutral-700";
const primaryButton =
  "h-10 rounded-lg bg-foreground px-4 text-background transition-[transform,opacity] duration-150 ease-out active:scale-[0.96] disabled:opacity-40 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2";
const muted = "text-neutral-500 dark:text-neutral-400";

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

function isEstimatePayload(
  value: unknown,
): value is Pick<Entry, "preAiMinutes" | "actualMinutes" | "reason"> {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Number.isFinite(v.preAiMinutes) &&
    (v.actualMinutes === null || Number.isFinite(v.actualMinutes)) &&
    typeof v.reason === "string"
  );
}

const icons: Record<View | "send" | "logo", ReactNode> = {
  logo: <path d="M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M3 12h2m14 0h2M5.6 18.4 7 17m10-10 1.4-1.4M8 12a4 4 0 1 0 8 0" />,
  today: <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  week: <path d="M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />,
  settings: <path d="M4 7h10m4 0h2M4 17h4m4 0h8M14 5v4m-6 6v4" />,
  send: <path d="M12 19V5m0 0-6 6m6-6 6 6" />,
};

function Icon({ name, className = "size-5" }: { name: keyof typeof icons; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

const views: { id: View; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "settings", label: "Settings" },
];

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  // The line Claude could not estimate, so the user can enter the minutes themselves.
  const [failedLine, setFailedLine] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [manualError, setManualError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState("");
  const [view, setView] = useState<View>("today");

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

    setView("today");
    setLoading(true);
    setError(null);
    setFailedLine(null);
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: line }),
      });
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setError("Something went wrong. Please try again.");
        setFailedLine(line);
        return;
      }
      if (!res.ok) {
        if (res.status !== 400) setFailedLine(line);
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Something went wrong. Please try again.";
        setError(message);
        return;
      }
      if (!isEstimatePayload(data)) {
        setError("Something went wrong. Please try again.");
        setFailedLine(line);
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
      setFailedLine(line);
    } finally {
      setLoading(false);
    }
  }

  function onManualSubmit(event: FormEvent) {
    event.preventDefault();
    const minutes = parseMinutesInput(manualInput);
    if (!failedLine || minutes === null) {
      setManualError(true);
      return;
    }
    const line = failedLine;
    update((current) => [createManualEntry(line, minutes), ...current]);
    setFailedLine(null);
    setManualInput("");
    setManualError(false);
    setError(null);
    setText("");
  }

  function startEdit(entry: Entry) {
    setEditingId(entry.id);
    setEditInput(formatMinutes(entry.preAiMinutes));
  }

  function saveEdit(id: string) {
    const minutes = parseMinutesInput(editInput);
    if (minutes !== null) update((current) => setEntryMinutes(current, id, minutes));
    setEditingId(null);
  }

  const today = entries.filter((e) => isToday(e.createdAt));
  const day = summarizeDay(entries, settings);
  const week = summarizeWeek(entries, settings);

  const navButton = (v: (typeof views)[number], compact: boolean) => (
    <button
      key={v.id}
      type="button"
      onClick={() => setView(v.id)}
      aria-current={view === v.id ? "page" : undefined}
      className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150 ${
        compact ? "justify-center" : "w-full"
      } ${
        view === v.id
          ? "bg-neutral-200/70 font-medium text-foreground dark:bg-neutral-800"
          : `${muted} hover:bg-neutral-200/40 hover:text-foreground dark:hover:bg-neutral-800/50`
      }`}
    >
      <Icon name={v.id} className="size-[18px]" />
      {v.label}
    </button>
  );

  return (
    <div className="flex h-dvh overflow-hidden font-sans">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 p-4 md:flex dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center gap-2 px-2 py-1">
          <Icon name="logo" className="size-6 text-emerald-500" />
          <span className="text-lg font-semibold tracking-tight">Day Done</span>
        </div>
        <p className={`mt-2 px-2 text-sm text-pretty ${muted}`}>
          You&apos;ve already worked a full day. AI just made it shorter.
        </p>
        <nav className="mt-6 flex flex-col gap-1" aria-label="Views">
          {views.map((v) => navButton(v, false))}
        </nav>
        <p className={`mt-auto px-2 text-xs text-pretty ${muted}`}>
          Your tasks stay in this browser. Only the line you type is sent to Claude.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
          <div className="flex items-center gap-2 md:hidden">
            <Icon name="logo" className="size-5 text-emerald-500" />
            <span className="font-semibold tracking-tight">Day Done</span>
          </div>
          <h1 className="hidden font-medium md:block">{views.find((v) => v.id === view)?.label}</h1>
          <nav className="flex gap-1 md:hidden" aria-label="Views">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-label={v.label}
                aria-current={view === v.id ? "page" : undefined}
                className={`flex size-10 items-center justify-center rounded-lg transition-colors duration-150 ${
                  view === v.id ? "bg-neutral-200/70 text-foreground dark:bg-neutral-800" : muted
                }`}
              >
                <Icon name={v.id} className="size-[18px]" />
              </button>
            ))}
          </nav>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-4 py-6">
            {view === "today" && (
              <>
                {day.done && day.doneAt && (
                  <div className="animate-enter mb-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
                    <p className="text-xl font-semibold">Day done.</p>
                    <p className="mt-1 text-pretty tabular-nums">
                      You delivered a full day of work by {formatClock(day.doneAt)}.
                      {day.timeBackMinutes > 0
                        ? ` The rest of the day is yours: ${formatMinutes(day.timeBackMinutes)} back to you.`
                        : " Time to stop for today."}
                    </p>
                    {day.afterDoneMinutes > 0 && (
                      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                        Since then you logged {formatMinutes(day.afterDoneMinutes)} more. That time went to more work,
                        not back to you.
                      </p>
                    )}
                  </div>
                )}

                {today.length === 0 ? (
                  <div className="flex flex-col items-center px-4 pt-16 text-center">
                    <Icon name="logo" className="size-10 text-emerald-500" />
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance">
                      What did you finish today?
                    </h2>
                    <p className={`mt-2 max-w-md text-pretty ${muted}`}>
                      Log each finished task in one line. Claude converts it into the time it would have taken without
                      AI. When that adds up to a full day ({formatMinutes(settings.targetMinutes)}), your day is done.
                    </p>
                    <button
                      type="button"
                      onClick={() => setText("Wrote the landing page copy for Acme with Claude, took 25 min")}
                      className="mt-6 rounded-full border border-neutral-300 px-4 py-2 text-sm transition-colors duration-150 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      Try: &ldquo;Wrote the landing page copy for Acme with Claude, took 25 min&rdquo;
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className={`text-sm font-medium ${muted}`}>Finished today</h2>
                    <ul className="mt-3 flex flex-col gap-3">
                      {today.map((e) => (
                        <li
                          key={e.id}
                          className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/60"
                        >
                          <div className="flex items-baseline justify-between gap-4">
                            <span className="text-pretty">{e.text}</span>
                            {editingId === e.id ? (
                              <input
                                autoFocus
                                name="edit-minutes"
                                aria-label={`Pre-AI time for ${e.text}`}
                                value={editInput}
                                onChange={(ev) => setEditInput(ev.target.value)}
                                onBlur={() => saveEdit(e.id)}
                                onKeyDown={(ev) => {
                                  if (ev.key === "Enter") saveEdit(e.id);
                                  if (ev.key === "Escape") setEditingId(null);
                                }}
                                className={`h-8 w-24 shrink-0 text-right tabular-nums ${field}`}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEdit(e)}
                                title="Change this estimate"
                                className="-mx-2 -my-2 shrink-0 rounded-md px-2 py-2 font-medium tabular-nums underline decoration-dotted underline-offset-4 transition-colors duration-150 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                              >
                                {formatMinutes(e.preAiMinutes)}
                              </button>
                            )}
                          </div>
                          <p className={`mt-2 text-sm text-pretty ${muted}`}>
                            {e.edited && e.reason !== "Estimated by you." && "Your estimate. Claude said: "}
                            {e.reason}
                            {e.actualMinutes !== null && ` You spent ${formatMinutes(e.actualMinutes)}.`}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}

            {view === "week" && (
              <section>
                <h2 className="text-2xl font-semibold tracking-tight md:hidden">This week</h2>
                <div className="mt-4 grid grid-cols-7 gap-2 md:mt-0" aria-hidden="true">
                  {week.days.map((d) => (
                    <div key={d.date.toISOString()} className="flex flex-col items-center gap-1">
                      <div className="flex h-28 w-full items-end overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
                        <div
                          className={`w-full transition-[height] duration-500 ease-out ${d.done ? "bg-emerald-500" : "bg-neutral-400 dark:bg-neutral-600"}`}
                          style={{ height: `${d.progress * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs ${muted}`}>{d.date.toLocaleDateString([], { weekday: "short" })}</span>
                    </div>
                  ))}
                </div>
                <dl className="mt-6 grid grid-cols-2 gap-3 text-sm tabular-nums">
                  {[
                    { label: "Pre-AI work delivered", value: formatMinutes(week.deliveredMinutes) },
                    { label: "Full days reached", value: String(week.fullDays) },
                    { label: "Back to you", value: formatMinutes(week.backToYouMinutes), accent: true },
                    { label: "Went to more work", value: formatMinutes(week.moreWorkMinutes) },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/60"
                    >
                      <dt className={muted}>{s.label}</dt>
                      <dd
                        className={`mt-1 text-2xl font-semibold ${s.accent ? "text-emerald-600 dark:text-emerald-400" : ""}`}
                      >
                        {s.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {week.aiSavedMinutes > 0 && (
                  <p className={`mt-4 text-sm ${muted}`}>
                    On tasks where you noted the time spent, AI saved you {formatMinutes(week.aiSavedMinutes)} this
                    week.
                  </p>
                )}
              </section>
            )}

            {view === "settings" && (
              <section className="flex flex-col gap-4">
                <h2 className="text-2xl font-semibold tracking-tight md:hidden">Settings</h2>
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
                  <span>
                    A full day is
                    <span className={`block text-sm ${muted}`}>A ceiling, not a goal.</span>
                  </span>
                  <select
                    name="full-day"
                    value={settings.targetMinutes}
                    onChange={(e) => changeSettings({ ...settings, targetMinutes: Number(e.target.value) })}
                    className={`h-10 ${field}`}
                  >
                    {[4, 5, 6, 7, 8].map((h) => (
                      <option key={h} value={h * 60}>
                        {h} hours
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
                  <span>
                    I usually stop at
                    <span className={`block text-sm ${muted}`}>Time after &ldquo;Day done&rdquo; counts as yours.</span>
                  </span>
                  <input
                    type="time"
                    name="end-time"
                    value={settings.endTime}
                    onChange={(e) => e.target.value && changeSettings({ ...settings, endTime: e.target.value })}
                    className={`h-10 ${field}`}
                  />
                </label>
                <p className={`px-1 text-sm text-pretty md:hidden ${muted}`}>
                  Your tasks stay in this browser. Only the line you type is sent to Claude.
                </p>
              </section>
            )}
          </div>
        </main>

        {/* Composer */}
        <div className="shrink-0 px-4 pb-4">
          <div className="mx-auto max-w-2xl">
            {failedLine && (
              <form
                onSubmit={onManualSubmit}
                className="mb-3 rounded-2xl border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <label htmlFor="manual" className="block text-sm">
                  How long would <span className="font-medium">&ldquo;{failedLine}&rdquo;</span> have taken you
                  without AI?
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="manual"
                    name="manual-minutes"
                    value={manualInput}
                    onChange={(e) => {
                      setManualInput(e.target.value);
                      setManualError(false);
                    }}
                    placeholder="e.g. 2h or 1h30"
                    className={`h-10 w-40 ${field}`}
                  />
                  <button type="submit" className={primaryButton}>
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setFailedLine(null)}
                    className={`h-10 rounded-lg px-3 text-sm transition-colors duration-150 hover:text-foreground ${muted}`}
                  >
                    Cancel
                  </button>
                </div>
                {manualError && (
                  <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    Try a time like 45min, 2h or 1h30 (up to 16h).
                  </p>
                )}
              </form>
            )}

            <form
              onSubmit={onSubmit}
              className="rounded-2xl border border-neutral-300 bg-white p-2 shadow-sm transition-[border-color,box-shadow] duration-150 focus-within:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-within:border-neutral-600"
            >
              <label htmlFor="task" className="sr-only">
                What did you just finish?
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="task"
                  name="task"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={300}
                  placeholder="What did you just finish?"
                  className="h-11 min-w-0 flex-1 bg-transparent px-3 placeholder:text-neutral-500 focus:outline-none dark:placeholder:text-neutral-400"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !text.trim()}
                  aria-label={loading ? "Estimating" : "Log task"}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-[transform,opacity] duration-150 ease-out active:scale-[0.96] disabled:opacity-30 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
                >
                  {loading ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Icon name="send" className="size-5" />
                  )}
                </button>
              </div>
            </form>

            {error && (
              <p role="alert" className="mt-2 px-1 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            {/* Day status */}
            <div className="mt-3 flex items-center gap-3 px-1" aria-live="polite">
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={settings.targetMinutes}
                aria-valuenow={Math.min(day.deliveredMinutes, settings.targetMinutes)}
                aria-label="Pre-AI work delivered today"
              >
                <div
                  className={`h-full rounded-full transition-[width,background-color] duration-500 ease-out ${day.done ? "bg-emerald-500" : "bg-foreground"}`}
                  style={{ width: `${day.progress * 100}%` }}
                />
              </div>
              <span className={`shrink-0 text-xs tabular-nums ${day.done ? "text-emerald-600 dark:text-emerald-400" : muted}`}>
                {day.done
                  ? `Day done · ${formatMinutes(day.timeBackMinutes)} back to you`
                  : `${formatMinutes(day.deliveredMinutes)} of ${formatMinutes(settings.targetMinutes)} delivered`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
