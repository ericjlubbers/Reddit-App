# Phase 5 — Manual trigger + observability

**Goal**: a moderator can trigger a poll on demand, and anyone debugging can
see exactly what state the app is in without re-reading code.

**Prerequisites**: Phase 4 complete.

## Steps

1. **Menu trigger toast** — already sketched in Phase 3. Confirm the toast text reads `Posted N · skipped N · failed N`.
2. **State-dump menu item** — add a second moderator-only menu item, `"Debug: dump state"`, calling `/internal/menu/dump-state`. The handler reads `rss:seen-guids` size, `rss:last-poll-at`, `rss:last-poll-result` and returns them as a `ShowToast` (or a `ShowForm` if the toast is too short).
3. **Per-tick summary log** — at the end of `runRssPipeline()`, emit one log line with `op: "pipeline.run"`, `status: "ok"`, `context: { ok, skipped, failed, durationMs }`. This is the single line a human grep can use to confirm a tick happened.
4. **Reset menu item** (mod-only, dangerous) — add `"Debug: reset dedupe state"` → `/internal/menu/reset-dedupe` that runs `redis.del("rss:seen-guids")` after a `ShowForm` confirmation. Useful when you want to re-test against a known feed.

## Acceptance criteria

`./scripts/verify.sh 5` passes:
- `runRssPipeline()` emits a single `pipeline.run status:ok` line at the end of every successful tick
- `dump-state` menu item exists and returns recognizable Redis state
- `reset-dedupe` menu item exists, gated by a `ShowForm` confirm step

## Verification (manual)

1. Click "Run RSS poll now" → toast appears with numbers.
2. Click "Debug: dump state" → toast/form shows `seen count`, `last poll`, `last result`.
3. Click "Debug: reset dedupe state" → confirm → click "Run RSS poll now" again → previously-seen items are reposted (in your test sub only!).
4. `npx devvit logs | grep '"op":"pipeline.run"' | tail -n 1` → returns the most recent tick's summary line.

## Troubleshooting

- **Dump menu shows stale data** → confirm you're reading via `redis.get` not a cached settings call.
- **Reset menu fires without confirm** → ensure the handler returns a `ShowForm` first; only execute on form submission.

## Hand-off to Phase 6

Commit and update `docs/PHASE-STATUS.md`.
