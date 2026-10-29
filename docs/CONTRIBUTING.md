# Contributing to Day Done

## Setup

Prerequisites: Node.js 20+ (developed on 24), npm, an [Anthropic API key](https://console.anthropic.com/).

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Without a key the app still runs: every estimate fails and the app asks for the minutes manually.

<!-- AUTO-GENERATED:scripts (source: package.json) -->
| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server (Turbopack) at http://localhost:3000 |
| `npm run build` | Production build with type checking |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest test suite once |
<!-- /AUTO-GENERATED:scripts -->

## Tests

- Run: `npm test` (Vitest, Node environment).
- Tests live next to the code as `*.test.ts` (`lib/*.test.ts`, `app/api/estimate/route.test.ts`).
- Put logic in `lib/` as pure functions and test it there; keep `app/page.tsx` thin.
- The API route test replaces the Anthropic SDK with a test double. The app itself always calls the real API.
- Dates in tests use local-time constructors (`new Date(2026, 9, 29, 14, 10)`) so day boundaries match the user's clock.

## Code style

- TypeScript strict mode; `npx tsc --noEmit` must pass.
- ESLint (`npm run lint`) with the Next.js config. No formatter or pre-commit hooks are configured.
- Product rules from [PRD.md](../PRD.md): no notifications, scores, streaks, accounts or invented numbers.

## Pull request checklist

- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass
- [ ] New logic has tests
- [ ] No secrets committed (`.env*` is ignored except `.env.example`)
- [ ] Conventional commit message (`feat:`, `fix:`, `docs:` …)
- [ ] The change does not add work, alerts or prompts for the user
