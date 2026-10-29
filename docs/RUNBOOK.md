# Day Done runbook

Production: https://innovationhackathonclaude-ljch.vercel.app/ (Vercel project `innovation_hackathon_claude-ljch`).

## Deploy

Every push to `main` on GitHub deploys to production automatically.

Manual deploy from a linked checkout (`vercel link --project innovation_hackathon_claude-ljch`):

```bash
vercel --prod
```

`vercel.json` pins the framework to Next.js. Without it, Vercel can treat the project as a static site and serve 404 for `/` and `/api/estimate`.

## Environment

| Variable | Where | Notes |
|----------|-------|-------|
| `ANTHROPIC_API_KEY` | Vercel → Settings → Environment Variables (Production) | Redeploy after changing it |

## Health check

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://innovationhackathonclaude-ljch.vercel.app/      # 200
curl -s -X POST https://innovationhackathonclaude-ljch.vercel.app/api/estimate \
  -H "content-type: application/json" -d '{"text":"Wrote a 600-word blog post, took 30 min"}'
# {"preAiMinutes":…,"actualMinutes":30,"reason":"…"}
```

## Common issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `/` returns 404 with `X-Vercel-Error: NOT_FOUND` | Framework preset is not Next.js | Keep `vercel.json`; check Settings → Build → Output Directory has no override |
| API returns 500 "not configured" | `ANTHROPIC_API_KEY` missing or misspelled | Add it in Vercel, then `vercel --prod` |
| API returns 502 | Claude timed out (15 s) or answered with something unusable | Users can enter minutes manually; check Vercel function logs |
| API returns 429 | Per-visitor limit (20 per 10 min, per server instance) | Wait 10 minutes |
| Deploy blocked: "Vulnerable version of Next.js" | Outdated `next` | `npm install next@<patched> eslint-config-next@<patched> --save-exact` |

Logs: `vercel logs innovationhackathonclaude-ljch.vercel.app` or the Vercel dashboard → Deployments → Functions.

## Rollback

```bash
vercel ls innovation_hackathon_claude-ljch   # find the last good deployment
vercel promote <deployment-url>
```

Or in the dashboard: Deployments → ⋯ on a good deployment → Promote to Production.

## Cost protection

The in-memory rate limit is best effort on serverless. The real backstop is a monthly spend limit on the Anthropic workspace (Console → Settings → Limits).

## Escalation

Single maintainer: the repo owner. Rotate the Anthropic key in the Anthropic Console if it may have leaked.
