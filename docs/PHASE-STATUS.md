# Phase status

This file is the single source of truth for "where are we?". Every commit that
completes or starts a phase **must** update this file.

| Phase | Status | Verification | Notes |
|---|---|---|---|
| 0 — Prerequisites | � done | `./scripts/verify.sh 0` — 4 pass · 0 fail | See `phase-0.answers.md`. App name `coloradosun-bot`, prod sub r/coloradosun (~3500 members), test sub r/coloradosun_dev. One open item: n8n webhook URL not yet created (n8n Cloud hostname `coloradosun.app.n8n.cloud` is known and sufficient for Phase 2) |
| 1 — Scaffold | 🟩 done | `./scripts/verify.sh 1` — 7 pass · 0 fail | Scaffolded via `devvit new --template bare` (current CLI's equivalent of the doc's "Hello World" template; renamed from `@devvit/server` to `@devvit/web`). Playtest verified live on r/coloradosun_dev, v0.0.1.1. Updated `phase-1-scaffold.md`, `CONVENTIONS.md`, and `verify.sh` to match current Devvit tooling (see commit). |
| 2 — `devvit.json` config | 🟩 done | `./scripts/verify.sh 2` — 9 pass · 0 fail | Config replaced with target from phase-2-config.md; RSS host `coloradosun.com` + n8n host `coloradosun.app.n8n.cloud`. `server.entry` set to `"index.js"` (resolves relative to default `server.dir: "dist/server"`, matching `build:server`'s actual esbuild output `dist/server/index.js` — verified, not assumed). Current Devvit CLI (0.13.9) has no `devvit build` command; updated `phase-2-config.md` and `verify.sh` to drop that stale check and rely on schema-shape checks + a manual `devvit playtest` run instead. Confirmed via `npx devvit playtest r/coloradosun_dev` → installed successfully as v0.0.1.2, no schema errors. Placeholder `assets/icon.png` (1024×1024) added; replace before Phase 6 launch. |
| 3 — Server implementation | 🟩 done | `./scripts/verify.sh 3` — 11 pass · 0 fail | All Phase 3 files implemented (`lib/log.ts`, `lib/redis.ts`, `lib/settings.ts`, `pipeline/rss.ts`, `pipeline/templates.ts`, `routes/cron.ts`, `routes/menu.ts`, `shared/types.ts`). Drift from phase-3-server.md's pseudocode, all resolved: (1) no Hono — wired the two new endpoints into the existing raw-`node:http` switch-statement router in `server.ts` via extended `Endpoint`/`EndpointMethod` consts; (2) imports come from `@devvit/web/server`, not `@devvit/server`; (3) `getSettings()` implemented now (Phase 4 will add the schema/UI) with defaults from `phase-0.answers.md`; (4) current `@devvit/redis` client has no Set commands (no `sAdd`/`sIsMember`) — `lib/redis.ts` emulates the seen-guid set with a hash (`hSet`/`hGet`) instead, same `rss:seen-guids` key; (5) added `fast-xml-parser` dependency (none existed) to parse the RSS feed — no other XML parser or DOMParser is available in this runtime. `npm test` (types + lint + unit + build) passes. Playtest verified live on r/coloradosun_dev, v0.0.1.3 — scheduler correctly auto-fired `/internal/cron/poll-rss` and structured logs (`server.listen`, `rss.fetch` start/error) matched the documented JSON shape exactly. 🟥 **Not launch-verified end-to-end**: `rss.fetch` fails with `PERMISSION_DENIED: HTTP request to domain: coloradosun.com is not allowed` even though `coloradosun.com` is listed in `devvit.json#permissions.http.domains` — this is the exact failure mode DEBUGGING.md's Phase 3 section already anticipates ("not on the allowlist... admin approval has come through"); the domain needs Reddit's admin approval before a real tick (and therefore the dedupe/webhook.send behavior) can be exercised end-to-end. Not a code defect — same class of external blocker as the n8n webhook URL. Added `webhook.site` to `devvit.json` domains for future webhook-payload debugging (per DEBUGGING.md's "Webhook payloads" surface); remove before Phase 6 launch if unused. |
| 4 — App settings | ⬜ not started | `./scripts/verify.sh 4` | Unblocked — `src/server/lib/settings.ts` already reads via `settings.getAll()` with defaults; Phase 4 adds the `devvit.json#settings` schema/UI on top without changing this file's shape. |
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
