# Day Done — PRD

> Built for the Claude Innovation Hackathon ("Take the load off"). Date: 2026-10-29. Build time: 3 hours, solo.

## 1. One-liner

**Day Done tells freelancers when they have already delivered a full day's work — measured in pre-AI hours — so the time AI saves goes back to them, not to more client work.**

## 2. Who it's for

**Freelancers and solo consultants who use AI every day** (writers, designers, developers, marketers, consultants).

- They set their own hours, so they *can* stop when the app says the day is done.
- Clients have seen how fast AI-assisted work is delivered and now expect more for the same price.
- Nobody tells a freelancer "that's enough for today" — so with AI, the day simply never ends.

## 3. The problem: compression burnout

AI compresses work: a client report that took 2 hours now takes 20 minutes. But the 1h40 saved does not go back to the freelancer. It is silently filled with more tasks, more clients and more revisions. Output goes up, hours stay the same or grow, and rest disappears.

The freelancer has no way to see that they already delivered a "normal" day of work by 2pm.

## 4. Hackathon fit

This builds on the idea **"A tracker for saved time"** — *logs the hours AI saved and shows whether they went to more work or back to people.*

Our twist: instead of measuring time *spent*, Day Done measures work *delivered*, converted into the hours it would have taken before AI. When that reaches a normal working day, the day is done.

## 5. How it works

1. **Log what you finished, in one line.** Example: *"Wrote the landing page copy for Acme with Claude, took 25 min."*
2. **Claude estimates the pre-AI time** for that task (e.g. 2h30) and gives a one-line reason. The freelancer can adjust the number with one click.
3. **The clock fills up.** The day bar shows pre-AI hours delivered against the daily target (default 8h, user-set).
4. **Day done.** When the bar reaches the target, the app says: *"You've delivered a full day of work. It's 14:10. The rest of the day is yours — 3h50 back to you."*
5. **Weekly truth.** A one-screen view shows hours AI saved this week and where they went:
   - **Back to you:** time between "day done" and your usual end time with no new tasks logged.
   - **Went to more work:** tasks logged after the day was already done.

## 6. MVP scope (must ship tonight)

| # | Feature | Done when |
|---|---|---|
| 1 | One-line task input | User types one line and presses Enter; nothing else is required |
| 2 | Claude pre-AI estimate | `/api/estimate` returns `{ preAiMinutes, actualMinutes, reason }` from a real Claude call |
| 3 | Adjustable estimate | User can edit the minutes inline; the edit is saved |
| 4 | Day bar + "Day done" state | Bar fills with pre-AI hours; at the target it switches to the "day done" message with time given back |
| 5 | Settings | Daily target (default 8h) and usual end time (default 18:00) |
| 6 | Weekly view | Shows saved hours split into "back to you" and "went to more work" |
| 7 | Local persistence | Entries stored in `localStorage`; still there tomorrow, no account |

**Bonus (only if time is left):** *Effort receipt* — a "Copy receipt" button that produces an honest note for a client: *"Delivered: landing page copy. AI-assisted drafting: 25 min. Equivalent effort: 2h30. Realistic turnaround for similar work: 1 day."* This helps freelancers defend their rates and deadlines.

## 7. Anti-goals (what we will NOT build)

The one rule is: give people time back, not help them do even more.

- **No notifications, reminders or alerts.** The app only speaks when opened.
- **No productivity score, streaks or leaderboards.** The target is a **ceiling, not a goal** — the app never says "beat yesterday".
- **No accounts, cloud database or tracking.** Data stays in the browser.
- **No timers or time tracking.** One line per finished task is the only input.
- **No task planning.** The app ends the day; it does not schedule more work.

## 8. AI design

- **Model:** Claude via the Anthropic API, called only from the server route (`/api/estimate`). The API key never reaches the browser.
- **Input:** the user's one line + their role (optional, from settings, e.g. "copywriter").
- **Output (JSON):**
  - `preAiMinutes` — estimated time for an experienced freelancer without AI
  - `actualMinutes` — time spent, if mentioned in the line (else `null`)
  - `reason` — one short sentence explaining the estimate
- **Honesty rules:** the estimate is always shown as an estimate, always with its reason, and always editable. If the API fails, the app says so and lets the user enter minutes manually — no fake numbers.

## 9. Technical design

- **Stack:** Next.js (App Router) + TypeScript, deployed on Vercel.
- **Server:** one route, `app/api/estimate/route.ts`, using the Anthropic SDK. Simple per-IP rate limit to protect API credits.
- **Client:** single page; state in `localStorage`.
- **Env:** `ANTHROPIC_API_KEY` (set in Vercel, `.env.local` locally; `.env.example` in the repo).
- **Tests:** unit tests for the day/week calculations (day done, back to you vs more work).

## 10. Judging alignment

| Criterion | Weight | How Day Done scores |
|---|---|---|
| Takes on the problem | 30% | Targets compression burnout directly; names its user (freelancers); builds on "A tracker for saved time" |
| It actually works | 30% | Live site on Vercel; real Claude estimates; real persistence; no mocked data |
| Someone would use it | 20% | README gets a stranger started in 3 steps; useful every working day; no setup or account |
| Gives time back | 20% | Its only job is to end the day; no alerts or prompts; shows where saved time went |

## 11. Success metrics

- **Time to first value:** under 60 seconds from opening the site to the first estimate.
- **Input cost:** one line per task, under 10 seconds.
- **Outcome:** share of "day done" days where no new tasks were logged afterwards (time actually given back).

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Estimates look invented ("nothing faked") | Show the reason for every estimate; make it editable |
| Logging tasks feels like extra work | One line, no forms; it replaces nothing the user must already do |
| The app turns into a productivity game | Ceiling framing, no scores or streaks, calm copy |
| Public API key gets abused | Server-side key + rate limit |
| Deploy fails at the last minute | Deploy an empty app to Vercel in the first 20 minutes |

## 13. Build plan (3 hours)

| Time | Work |
|---|---|
| 0:00–0:20 | Scaffold Next.js, push to GitHub, deploy to Vercel |
| 0:20–1:10 | `/api/estimate` with Claude + one-line input + entry list |
| 1:10–1:50 | Day bar, "day done" state, settings, `localStorage` |
| 1:50–2:10 | Weekly view (back to you vs more work) |
| 2:10–2:35 | README + hackathon form text |
| 2:35–3:00 | Test as a stranger, fix, final deploy. Receipt button only if time allows |

## 14. Open questions

- [x] Claude API key: own key with $100 credits
- [ ] Vercel and GitHub accounts ready?
- [x] Final product name: **Day Done** — *"You've already worked a full day. AI just made it shorter."*
