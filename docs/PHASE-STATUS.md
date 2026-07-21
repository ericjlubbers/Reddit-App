# Phase status

This file is the single source of truth for "where are we?". Every commit that
completes or starts a phase **must** update this file.

| Phase | Status | Verification | Notes |
|---|---|---|---|
| 0 — Prerequisites | � done | `./scripts/verify.sh 0` — 4 pass · 0 fail | See `phase-0.answers.md`. App name `coloradosun-bot`, prod sub r/coloradosun (~3500 members), test sub r/coloradosun_dev. One open item: n8n webhook URL not yet created (n8n Cloud hostname `coloradosun.app.n8n.cloud` is known and sufficient for Phase 2) |
| 1 — Scaffold | ⬜ not started | `./scripts/verify.sh 1` | Unblocked — app name + test sub confirmed |
| 2 — `devvit.json` config | ⬜ not started | `./scripts/verify.sh 2` | Unblocked — RSS host `coloradosun.com` + n8n host `coloradosun.app.n8n.cloud` confirmed |
| 3 — Server implementation | ⬜ not started | `./scripts/verify.sh 3` | 🟥 partially blocked — n8n webhook path not yet created; webhook.send can't be end-to-end tested until it exists |
| 4 — App settings | ⬜ not started | `./scripts/verify.sh 4` | — |
| 5 — Manual trigger + observability | ⬜ not started | `./scripts/verify.sh 5` | — |
| 6 — Launch | ⬜ not started | `./scripts/verify.sh 6` | Blocked on n8n webhook URL; T&C/Privacy Policy already available at https://coloradosun.com/editorial-standards-and-policies/ |

## Legend

- 🟩 done
- 🟡 in progress
- 🟥 blocked (with reason in Notes)
- ⬜ not started

## Update rules for implementers

1. Set the phase you're starting to 🟡 in the same commit as your first code change for that phase.
2. Run `./scripts/verify.sh <phase>` locally before marking 🟩.
3. If you discover a missing prerequisite, set the phase to 🟥 and write a one-line Notes entry naming the blocker. Do **not** silently work around it.
