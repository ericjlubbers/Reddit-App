# Phase status

This file is the single source of truth for "where are we?". Every commit that
completes or starts a phase **must** update this file.

| Phase | Status | Verification | Notes |
|---|---|---|---|
| 0 — Prerequisites | 🟡 in progress | `./scripts/verify.sh 0` | Awaiting user input via `phase-0.answers.md` |
| 1 — Scaffold | ⬜ not started | `./scripts/verify.sh 1` | Blocked on Phase 0 #1 (app name) |
| 2 — `devvit.json` config | ⬜ not started | `./scripts/verify.sh 2` | Blocked on Phase 0 #4, #5 (n8n + RSS hostnames) |
| 3 — Server implementation | ⬜ not started | `./scripts/verify.sh 3` | — |
| 4 — App settings | ⬜ not started | `./scripts/verify.sh 4` | — |
| 5 — Manual trigger + observability | ⬜ not started | `./scripts/verify.sh 5` | — |
| 6 — Launch | ⬜ not started | `./scripts/verify.sh 6` | Blocked on Phase 0 #2 (>200 members?), #3 (T&C + Privacy Policy) |

## Legend

- 🟩 done
- 🟡 in progress
- 🟥 blocked (with reason in Notes)
- ⬜ not started

## Update rules for implementers

1. Set the phase you're starting to 🟡 in the same commit as your first code change for that phase.
2. Run `./scripts/verify.sh <phase>` locally before marking 🟩.
3. If you discover a missing prerequisite, set the phase to 🟥 and write a one-line Notes entry naming the blocker. Do **not** silently work around it.
