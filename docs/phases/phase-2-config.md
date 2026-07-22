# Phase 2 — `devvit.json` configuration

**Goal**: declare every permission, scheduled task, menu item, and asset the
app needs, so Phase-3 code can rely on them being present.

**Prerequisites**: Phase 1 complete; Phase 0 #4 (n8n hostname), #5 (RSS
hostname).

## Steps

1. Replace the scaffolded `devvit.json` with the configuration below (substituting your values).
2. Drop a 1024×1024 PNG into `assets/icon.png`. A placeholder is fine for dev; replace before Phase 6 launch.
3. Current Devvit CLI (`@devvit/cli` 0.13.9) has no `devvit build`/validate-only command (verified via `npx devvit help`; only `init, install, login, logout, logs, metrics, new, playtest, publish, uninstall, upload, version, view, whoami` exist). Schema-shape checks in `./scripts/verify.sh 2` (domains, scheduler endpoint, menu endpoint, redis, reddit scope, icon file, valid JSON) stand in for automated validation. For real end-to-end confirmation that Reddit's backend accepts the config, run `npx devvit playtest <your-test-sub>` manually and confirm it installs without a schema error, then stop it (Ctrl+C) — this is a manual step, not part of `verify.sh`, since `playtest` is a long-running watch/log-stream process.

## Target `devvit.json`

```json
{
  "$schema": "https://developers.reddit.com/schema/config-file.v1.json",
  "name": "<APP_NAME_FROM_PHASE_0>",
  "server": { "entry": "src/server/index.js" },
  "permissions": {
    "redis": true,
    "reddit": { "enable": true, "scope": "moderator" },
    "http": {
      "enable": true,
      "domains": ["<RSS_HOSTNAME>", "<N8N_HOSTNAME>"]
    },
    "media": false,
    "payments": false,
    "realtime": false
  },
  "scheduler": {
    "tasks": {
      "poll-rss": {
        "endpoint": "/internal/cron/poll-rss",
        "cron": "*/15 * * * *"
      }
    }
  },
  "menu": {
    "items": [
      {
        "label": "Run RSS poll now",
        "description": "Manually trigger the RSS-to-Reddit pipeline",
        "forUserType": "moderator",
        "location": "subreddit",
        "endpoint": "/internal/menu/run-poll"
      }
    ]
  },
  "marketingAssets": { "icon": "assets/icon.png" },
  "dev": { "subreddit": "<PERSONAL_TEST_SUB>" }
}
```

## Validation rules (from Reddit's docs)

- `name`: 3–16 chars, `^[a-z][a-z0-9-]*$`.
- `permissions.http.domains[]`: **bare hostnames only**. No wildcards (`*.x.com`), no protocols (`https://x.com`), no paths (`x.com/api`).
- All `endpoint` values must start with `/internal/`.
- Cron format: standard 5-part or 6-part (`*/15 * * * *` or `*/30 * * * * *`).
- The server bundle entry must be `.js` (built from TS).

## Acceptance criteria

`./scripts/verify.sh 2` passes:
- `devvit.json` exists and is valid JSON
- Contains `permissions.http.domains` with at least 2 bare hostnames
- Contains `scheduler.tasks.poll-rss` with `endpoint: "/internal/cron/poll-rss"`
- Contains `menu.items[].endpoint: "/internal/menu/run-poll"`
- `assets/icon.png` exists

Real-world confirmation (manual, not part of `verify.sh`): `npx devvit playtest <your-test-sub>` installs the config without a schema error.

## Troubleshooting

- **"domains must be exact hostnames"** → strip protocol/path; `https://example.com/feed.xml` becomes `example.com`.
- **Schema validation errors** → run with the `$schema` line so your editor highlights problems inline.
- **Icon error at build time** → the file must be exactly 1024×1024 and PNG.
- **`server.entry` mismatch** → `server.entry` resolves relative to `server.dir` (default `"dist/server"`, per the config schema), not the project root. Verify against the actual `build:server` esbuild output path rather than assuming `src/server/index.js` — with the default `--outdir=dist/server` in `package.json#scripts.build:server`, the correct value is `"index.js"` (i.e. `dist/server/index.js` once resolved).
- **`npx devvit build` errors with "is not a devvit command"** → expected on current CLI (0.13.9); there is no build/validate-only command. Use the schema-shape checks in `verify.sh` plus a manual `devvit playtest` run instead.

## Hand-off to Phase 3

Commit `devvit.json` + `assets/icon.png` + update `docs/PHASE-STATUS.md`.
