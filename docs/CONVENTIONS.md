# Conventions

Read this before writing any code in this repo. These conventions exist so that
a less-expensive implementation model can pick up work without drifting and so
that debugging is deterministic.

## Repo layout

```
.
├── README.md
├── devvit.json                      # phase 2+
├── package.json                     # phase 1+
├── assets/icon.png                  # phase 2+
├── src/
│   ├── server/
│   │   ├── index.ts                 # Hono bootstrap + route registration
│   │   ├── routes/
│   │   │   ├── cron.ts              # POST /internal/cron/poll-rss
│   │   │   └── menu.ts              # POST /internal/menu/run-poll
│   │   ├── pipeline/
│   │   │   ├── rss.ts               # fetch + parse + dedupe + post + comment + webhook
│   │   │   └── templates.ts         # renderComment(item, template)
│   │   └── lib/
│   │       ├── log.ts               # structured logger (see below)
│   │       ├── redis.ts             # markSeen / isSeen / lastPoll helpers
│   │       └── settings.ts          # typed reader for app settings
│   └── shared/
│       └── types.ts                 # RssItem, WebhookPayload, AppSettings
├── docs/                            # design docs, plan, debug recipes
└── scripts/
    └── verify.sh                    # phase-specific checks
```

## TypeScript

- `"strict": true`. No `any` without an inline `// reason: …` comment.
- Server bundle must compile to **CommonJS** (`module: "commonjs"`, `target: "es2022"`). Devvit Web does not accept ES modules in the server bundle.
- All imports use `.js` extensions in compiled output; in source, prefer `tsx`/`ts` paths that the build tool resolves.

## Naming

- File names: `kebab-case.ts`
- Exported functions: `camelCase`
- Exported types/interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Redis keys: `kebab:case:colons` — e.g., `rss:seen-guids`, `rss:last-poll-at`

## Error handling

- **Boundary-only validation.** Validate at HTTP entry, RSS parse, and settings read. Internal helpers assume validated inputs.
- Use `Result`-style returns *only* where partial-failure semantics matter (the per-item pipeline loop). Elsewhere, throw.
- Each per-item failure in the RSS pipeline is caught, logged, and skipped — one bad item must not poison the whole tick.
- Never swallow an error silently. Every `catch` either re-throws or calls `log.error(...)` with a structured payload.

## Structured logging (the heart of the debugging system)

Every log line is a single JSON object on one line. Format:

```json
{"ts":"2026-06-22T17:00:00Z","level":"info","phase":"3","op":"rss.submit-post","status":"ok","durationMs":412,"context":{"guid":"abc","postId":"t3_xxx"}}
```

Required keys: `ts`, `level`, `op`, `status`. Optional: `durationMs`, `context`, `error`.

- `level`: `debug | info | warn | error`
- `op`: dotted path identifying the operation — `rss.fetch`, `rss.parse`, `rss.dedupe`, `rss.submit-post`, `rss.submit-comment`, `webhook.send`, `redis.mark-seen`, etc.
- `status`: `start | ok | skip | error`
- `phase`: kept in logs during dev so it's easy to grep which phase's code is failing in playtest. Remove or repurpose after MVP.

Use the `log` helper in `src/server/lib/log.ts` — never call `console.log` directly inside pipeline code.

## HTTP routes

- All scheduler/menu/trigger endpoints live under `/internal/*` (Devvit requirement).
- Webview-facing endpoints live under `/api/*` (not used at MVP).
- Each route is thin: parse request → call a pipeline function → format response. **No business logic in route handlers.**

## Settings

- Read app settings via `src/server/lib/settings.ts` only. It returns a typed `AppSettings` object and throws if a required value is missing.
- Default values live in `settings.ts`, not in the call sites.
- If `settings.enabled === false`, the pipeline returns immediately with `status: "skip"` — this is the kill-switch.

## Commits

- One logical change per commit.
- Conventional-Commits style: `feat(phase-3): add rss fetch + parse`, `fix(phase-3): handle empty feed`, `chore: bump devvit cli`.
- Reference the phase in the scope when applicable.
- Do not commit `phase-0.answers.md` (gitignored).

## Phase discipline

- Do not start phase N+1 until `./scripts/verify.sh N` passes and [docs/PHASE-STATUS.md](PHASE-STATUS.md) is updated.
- If something is blocked by a phase prerequisite, add a `BLOCKED:` note to `PHASE-STATUS.md` rather than skipping ahead.
