# Day Done

**You've already worked a full day. AI just made it shorter.**

Day Done tells freelancers when they have already delivered a full day's work — measured in the hours it would have taken *before* AI — so the time AI saves goes back to them, not to more client work.

**Live app:** https://innovationhackathonclaude-ljch.vercel.app/ — no account, no install.

## Who it's for

Freelancers and solo consultants who use AI every day: writers, designers, developers, marketers.

AI compresses their work. A client blog post that took 2½ hours now takes 30 minutes. But the time saved doesn't go back to them: clients expect more for the same price, and nobody tells a freelancer "that's enough for today". That is **compression burnout** — output goes up, the day never ends.

## Hackathon fit

Built for the Claude Innovation Hackathon, *"Take the load off"*. It builds on the idea **"A tracker for saved time"** — logs the hours AI saved and shows whether they went to more work or back to people.

The twist: Day Done measures work **delivered**, converted into pre-AI hours. When that reaches a normal working day, your day is done — even if it's 2pm.

## How to use it (30 seconds)

1. **Open the app** and type what you just finished, in one line:
   *"Wrote the landing page copy for Acme with Claude, took 25 min"*
2. **Claude estimates the pre-AI time** (e.g. 2h30) and says why in one sentence. Click the time to change it if you disagree.
3. **Watch the bar fill.** When it reaches a full day (8h by default), you see:
   > **Day done.** You delivered a full day of work by 14:10. The rest of the day is yours: 3h50 back to you.

The **This week** view shows how much time went **back to you** and how much **went to more work** after a full day was already done.

## How it gives time back

- **It ends the day for you.** Its one job is to tell you that you have done enough.
- **It adds no work.** One line per finished task. No timers, no forms, no accounts.
- **It never interrupts.** No notifications, reminders, streaks or scores. It only speaks when you open it.
- **The target is a ceiling, not a goal.** It never says "beat yesterday".
- **It shows where the time went.** Time after "day done" counts either as back to you, or honestly as more work.

## Honest by design

- Every estimate comes from a real Claude call, shows its reason, and can be edited.
- If Claude is unavailable, the app says so and asks you for the minutes. It never invents numbers.
- "AI saved" is only counted where you said how long a task really took.

## Privacy

Your tasks are stored only in your browser (`localStorage`). The only thing that leaves your device is the one line you type, sent to Claude to get the estimate. There are no accounts and no database.

## Run it locally

Requires Node.js 20+ and an [Anthropic API key](https://console.anthropic.com/).

```bash
git clone https://github.com/ThalisRuan/innovation_hackathon_claude.git
cd innovation_hackathon_claude
npm install
cp .env.example .env.local   # then put your key in .env.local
npm run dev                  # open http://localhost:3000
```

<!-- AUTO-GENERATED:scripts (source: package.json) -->
| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server (Turbopack) at http://localhost:3000 |
| `npm run build` | Production build with type checking |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest test suite once |
<!-- /AUTO-GENERATED:scripts -->

<!-- AUTO-GENERATED:env (source: .env.example) -->
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key used by the server route `/api/estimate`. Never sent to the browser. | `sk-ant-...` |
<!-- /AUTO-GENERATED:env -->

## How it works

```
Browser (Next.js page)                         Server (Vercel function)
──────────────────────                         ────────────────────────
one-line task  ──── POST /api/estimate ─────▶  validate input (zod)
                                               rate limit per visitor
                                               Claude (claude-haiku-5-5)
entry saved in  ◀── {preAiMinutes,        ───  validate JSON answer
localStorage         actualMinutes, reason}
day bar, "Day done", weekly view: computed in the browser (lib/day.ts, lib/week.ts)
```

| Path | What it does |
|------|--------------|
| `app/page.tsx` | The whole UI: input, day bar, "Day done", task list, weekly view, settings |
| `app/api/estimate/route.ts` | Calls Claude server-side; validation, rate limit, timeouts, safe errors |
| `lib/estimate.ts` | Prompt, request validation, parsing Claude's answer |
| `lib/day.ts` | When the day is done and how much time goes back to you |
| `lib/week.ts` | Weekly totals: back to you vs went to more work |
| `lib/entries.ts` | Editing estimates and manual entries |
| `lib/storage.ts` | Safe `localStorage` read/write |

**Tests:** 33 unit tests (`npm test`) cover the API route, estimate parsing, day and week calculations, editing and storage.

## Built with

Next.js 15, TypeScript, Tailwind CSS, the [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript), Vitest, Vercel.

Product spec: [PRD.md](PRD.md).
