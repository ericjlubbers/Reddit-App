# Phase 4 — App settings

**Goal**: a non-engineer mod can change RSS URL, n8n webhook URL, comment
template, and toggle the kill-switch — without a redeploy.

**Prerequisites**: Phase 3 complete.

## Steps

1. Define settings in the Developer Portal app config (preferred) or via `devvit.json` settings schema if the current schema supports it.
2. Implement `src/server/lib/settings.ts` with a typed `getSettings(): Promise<AppSettings>` that:
   - Reads each value from the Devvit settings API.
   - Validates required values (throws with a clear message if missing).
   - Returns defaults for `commentTemplate` and `pollCron`-style optional values.
3. Wire `runRssPipeline()` to read settings at the top of every tick.
4. Respect `settings.enabled === false` as a no-op (already in Phase 3 sketch).

## Required setting fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `rssUrl` | string | yes | Must be in `permissions.http.domains` |
| `n8nWebhookUrl` | string | yes | Must be in `permissions.http.domains` |
| `commentTemplate` | multiline string | no (default provided) | Placeholders: `{title}`, `{link}`, `{summary}`, `{publishedAt}` |
| `enabled` | boolean | yes | Kill-switch |

## Default comment template

```text
{summary}

— Read more at {link}
```

## Acceptance criteria

`./scripts/verify.sh 4` passes:
- `src/server/lib/settings.ts` exports `getSettings`
- Setting changes in the Developer Portal take effect on the next tick without redeploy (manual test)
- `enabled: false` causes `pipeline.run status:skip` in logs (manual test)

## Troubleshooting

- **Setting saved in portal but code reads old value** → settings are cached briefly; wait one cron cycle or trigger the menu item, which always reads fresh.
- **Type mismatch between portal and code** → keep field names identical and types simple (string/boolean only).

## Hand-off to Phase 5

Commit and update `docs/PHASE-STATUS.md`.
