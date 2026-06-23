# Debugging system

The point of this doc: when something breaks, you should be able to find the
cause **without re-asking an LLM to investigate from scratch**. The
investigation path is the same every time.

## The five surfaces you can inspect

| Surface | Command | What you learn |
|---|---|---|
| **Devvit logs** | `npx devvit logs` (run from repo root during playtest) | Every server log line for the playtest session |
| **Filtered logs** | `npx devvit logs \| jq 'select(.op \| startswith("rss."))'` | Just one operation family |
| **Redis state** | Menu item → "Debug: dump Redis state" (added in Phase 5) | What the dedupe + last-poll state looks like right now |
| **Webhook payloads** | Point `n8nWebhookUrl` at <https://webhook.site> | Exact payload shape n8n receives |
| **Verify script** | `./scripts/verify.sh <phase>` | Whether the current phase's acceptance criteria pass |

## Structured log conventions (recap from CONVENTIONS.md)

```
{"ts":"…","level":"…","phase":"…","op":"…","status":"start|ok|skip|error","durationMs":…,"context":{…},"error":{…}}
```

Always log a `start` and an `ok`/`error` pair around any operation that can fail
(fetch, parse, submitPost, submitComment, webhook send). The `durationMs`
difference tells you immediately whether you're approaching the 30-second
request ceiling.

## Per-phase debug recipes

### Phase 0 — Prerequisites
- **Failure mode**: missing inputs blocking later phases.
- **Check**: `./scripts/verify.sh 0` — confirms `phase-0.answers.md` exists and all required fields are filled.
- **Where to fix**: edit `phase-0.answers.md`.

### Phase 1 — Scaffold
- **Failure mode**: `npm run dev` errors, can't reach test sub.
- **Checks**:
  - `node --version` → must be `>= 22.2.0`
  - `npx devvit whoami` → must show your Reddit username
  - `npm run dev` → must print "Playtest ready" and a `r/<name>_dev` URL
- **Common failures**:
  - "Not authenticated" → run `npx devvit login`
  - "Subreddit not found" → check `package.json#scripts.dev` points to a sub you moderate
  - Build errors about ES modules → confirm `tsconfig.json#module === "commonjs"` for the server

### Phase 2 — `devvit.json` config
- **Failure mode**: invalid config silently disables features.
- **Checks**:
  - `npx devvit build` → must exit 0 (validates `devvit.json` against the schema)
  - `./scripts/verify.sh 2` → grep checks for required keys (permissions, scheduler, menu, icon)
- **Common failures**:
  - `domains` contains a wildcard, protocol, or path → must be bare hostnames
  - `endpoint` doesn't start with `/internal/` → schema rejects
  - Missing `marketingAssets.icon` → only fails at `npm run launch`, not playtest

### Phase 3 — Server implementation
- **Failure mode**: the RSS pipeline silently does nothing, or fails on one item type.
- **Debug procedure**:
  1. In one terminal: `npm run dev`
  2. In another: `npx devvit logs | jq -c 'select(.op | startswith("rss."))'`
  3. In the test sub, click the **"Run RSS poll now"** menu item (added in Phase 5; for Phase 3 you'll temporarily expose a manual route)
  4. Watch the log stream for `start`/`ok`/`error` pairs per `op`
- **Common failures**:
  - `rss.fetch error "context deadline exceeded"` → either RSS host is slow or not on the allowlist. Check `devvit.json#permissions.http.domains` includes the *bare hostname* and that admin approval has come through.
  - `rss.parse error "non-XML"` → the RSS host is returning HTML (CDN block, hot-link protection). Re-fetch with a browser User-Agent in the request headers.
  - `rss.submit-post error "RATELIMIT"` → too-similar titles in close succession. Add a per-post sleep or randomize ordering.
  - Posts succeed but comments don't → the post ID format. `submitComment({ id: post.id })` expects the full thing-id (e.g., `t3_abc`); confirm via the log.
  - Same item posted twice → dedupe key mismatch. Log the GUID before SISMEMBER and confirm it matches what was SADD'd previously. The fix is almost always normalizing whitespace + lowercasing.

### Phase 4 — App settings
- **Failure mode**: code reads settings but they're not actually wired through Developer Portal.
- **Checks**:
  - Set `enabled: false` in the portal → next cron tick logs `status: "skip"` and posts nothing.
  - Change `commentTemplate` → next post's comment reflects the new template without redeploy.
- **Common failures**:
  - Settings schema mismatch → portal lets you save a value that the code rejects. Keep field names identical between Developer Portal config and `AppSettings` type.

### Phase 5 — Manual trigger + observability
- **Failure mode**: hard to know whether the last cron tick succeeded.
- **Checks**:
  - Click "Run RSS poll now" → toast shows N items, with N matching log count of `rss.submit-post status:ok`.
  - `lastPollAt` key in Redis updates after every tick (success or failure).
- **Recovery procedure**: if a tick errored mid-pipeline, the dedupe set already contains items it managed to mark as seen — they will not be reposted. Use the "Debug: dump Redis state" menu item to inspect.

### Phase 6 — Launch
- **Failure mode**: app review rejection or allowlist domain rejection.
- **Checks**:
  - `npx devvit upload` → must exit 0 (separately from review)
  - Developer Portal → app page → check **Review status** and **Allowlisted domains** sections
- **Common failures**:
  - Allowlist domain denied → contact Reddit dev support with a justification (it's your news org's RSS feed; that's a clean justification)
  - App review denied → typically requires clearer app description or working T&C/Privacy URLs

## How to capture a bug report (so a cheap model can fix it)

When you encounter a failure, save the following into `docs/bugs/<short-name>.md`:

```markdown
# Bug: <short name>

**Phase**: <number>
**Date**: <YYYY-MM-DD>
**Severity**: blocker | high | medium | low

## Symptom

What you observed (one paragraph).

## Reproduction

1. Step
2. Step
3. Step

## Logs

```
<paste 5–20 lines from `npx devvit logs` around the failure>
```

## Hypothesis

What you think the cause is (optional, but speeds up the implementer).

## Expected fix location

File(s) you suspect. Optional.
```

A cheap implementation model can read this template and act on it without
needing to reproduce or re-investigate the environment.
