# Reddit RSS Auto-Poster (Devvit + n8n)

A Devvit Web app installed on a single news-org-owned subreddit. It polls an RSS
feed on a cron schedule, submits a link post + a contextual first comment for
each new item, then notifies n8n via an outbound webhook so downstream workflows
can fan out (logging, cross-posting, alerts, dashboards).

Runs on Reddit's infrastructure under an app bot account. **No Reddit Data API
approval needed** — Devvit is its own developer track and bypasses the
Nov-2025 self-service closure of the public Data API.

## Fetch Domains

The following domains are requested for this app:

- `coloradosun.com` - The Colorado Sun's own domain, used to fetch its own RSS feed (`https://coloradosun.com/feed/?partner-feed=reddit-rss`). The app polls this feed on a cron schedule and posts only The Colorado Sun's own published articles to r/coloradosun. No user data or third-party content is fetched from this domain.
- `coloradosun.app.n8n.cloud` - The Colorado Sun's own n8n Cloud automation endpoint. After each successful post, the app sends a webhook to this domain to notify internal workflows (logging, cross-posting, alerts, dashboards). This endpoint is controlled by The Colorado Sun and is not a consumer-facing or shared service.

## Where to look

| Doc | Purpose |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Full architecture, phases, decisions, risks |
| [docs/PHASE-STATUS.md](docs/PHASE-STATUS.md) | Current phase + what's done / blocked. Single source of truth for "where are we?" |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | Code, logging, error, and commit conventions. Read this before writing any code |
| [docs/DEBUGGING.md](docs/DEBUGGING.md) | Per-phase debug recipes + structured log format + how to inspect Redis / webhooks |
| `docs/phases/` | One file per phase with goals, steps, acceptance criteria, troubleshooting |
| `scripts/verify.sh` | Phase-specific verification: `./scripts/verify.sh 1` runs Phase-1 checks |

## Quick orientation

- **Stack**: Devvit Web, TypeScript, Node 22.2+, raw `node:http` server, `@devvit/web/server` SDK, Redis (Devvit-managed)
- **Identity**: App bot account (named by `devvit.json#name`)
- **Trigger**: cron task in `devvit.json` calling `/internal/cron/poll-rss`
- **Manual trigger**: subreddit menu item `"Run RSS poll now"`
- **n8n integration**: outbound `fetch()` to a configurable webhook URL after each successful post

## Working on this repo

```bash
./scripts/verify.sh status        # show current phase + outstanding items
./scripts/verify.sh <phase-num>   # run phase-specific checks (0–6)
```

Anything contributed must satisfy `./scripts/verify.sh <current-phase>` before
the phase is marked complete in [docs/PHASE-STATUS.md](docs/PHASE-STATUS.md).
