# Reddit RSS Auto-Poster (Devvit + n8n)

A Devvit Web app installed on a single news-org-owned subreddit. It polls an RSS
feed on a cron schedule, submits a link post + a contextual first comment for
each new item, then notifies n8n via an outbound webhook so downstream workflows
can fan out (logging, cross-posting, alerts, dashboards).

Runs on Reddit's infrastructure under an app bot account. **No Reddit Data API
approval needed** — Devvit is its own developer track and bypasses the
Nov-2025 self-service closure of the public Data API.

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

- **Stack**: Devvit Web, TypeScript, Node 22.2+, Hono server, `@devvit/server` SDK, Redis (Devvit-managed)
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
