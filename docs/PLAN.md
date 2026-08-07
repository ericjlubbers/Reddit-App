# Plan: Reddit RSS Auto-Poster on Devvit (n8n webhook fan-out)

A Devvit Web app installed on the news org's own subreddit. It runs on Reddit's
infrastructure under an app bot account, polls the org's RSS feed on a cron
schedule, submits a link post + a contextual top-level comment for each new
item, then notifies n8n via an outbound webhook so downstream workflows
(logging, cross-posting, alerts, dashboards) can hang off it. **No Reddit Data
API approval needed** — Devvit is its own developer track and bypasses the
Nov-2025 gate.

## Architecture summary

- **Runtime**: Devvit Web (server-only at MVP; `post`/webview added in a later phase for the in-Reddit dashboard).
- **Identity**: App bot account (Devvit-provisioned, named by `devvit.json#name`). Posts and comments are attributed to this account. Alternative: `permissions.reddit.asUser: ["SUBMIT_POST","SUBMIT_COMMENT"]` would post as the installing mod — not what we want.
- **Trigger**: `scheduler` cron task in `devvit.json` (e.g., `*/15 * * * *`) calling `/internal/cron/poll-rss`.
- **Flow per tick**: fetch RSS → parse → dedupe seen GUIDs in Redis → for each new item: `reddit.submitPost({ subredditName, title, url })` → `reddit.submitComment({ id: post.id, text })` → outbound `fetch()` of a minimal `post.created` notification to the org's `api.coloradosun.com` gateway, which forwards it to n8n (and, on failure, a `post.failed` notification with diagnostic fields) — see Phases 7–9.
- **Manual trigger**: subreddit menu item ("Run RSS poll now") for moderators — used for testing and recovery.
- **State**: Redis SET of processed item GUIDs (+ `lastPollAt` / `lastPollResult` keys).

## Phases

| # | Name | Output |
|---|---|---|
| 0 | [Prerequisites](phases/phase-0-prerequisites.md) | Name, subreddit, RSS URL, n8n webhook, T&C, Privacy Policy, decisions logged |
| 1 | [Scaffold](phases/phase-1-scaffold.md) | Devvit template cloned, `npm run dev` works on a personal test sub |
| 2 | [`devvit.json` config](phases/phase-2-config.md) | Permissions, scheduler, menu, icon all wired |
| 3 | [Server implementation](phases/phase-3-server.md) | RSS pipeline submitting posts + comments + webhook |
| 4 | [App settings](phases/phase-4-settings.md) | Mods can edit RSS URL / webhook / template without redeploy |
| 5 | [Manual trigger + observability](phases/phase-5-trigger-observability.md) | Menu trigger + structured logs + state in Redis |
| 6 | [Launch](phases/phase-6-launch.md) | `npm run launch`, review, install on production sub |
| 7 | [API gateway](phases/phase-7-api-gateway.md) | `api.coloradosun.com` live on Google Cloud Run, DNS wired at Network Solutions, shared-secret auth, `reddit-rss` route forwarding to n8n |
| 8 | [Notification payload](phases/phase-8-notification-payload.md) | Devvit app sends pared-back `post.created`/`post.failed` events to the gateway instead of a rich payload direct to n8n |
| 9 | [README cleanup](phases/phase-9-readme-cleanup.md) | README describes actual app behavior only; no stale n8n/test-domain references |

## Decisions captured

- **Devvit, not the Data API** — bypasses the Nov-2025 approval gate; Devvit has its own per-launch review instead.
- **Pattern C** — Devvit polls + posts; notifies n8n via webhook (user's selection).
- **App account identity** — posts attributed to the app's bot account, not the installing mod.
- **Server-only at MVP** — webview (in-Reddit dashboard) added later.
- **Cron lives in `devvit.json`** — cadence change = redeploy; acceptable for MVP.
- **`api.coloradosun.com` gateway, not a direct n8n domain** — `coloradosun.app.n8n.cloud` could not get Reddit allowlist approval as a third-party host; an org-owned gateway domain in front of it can. Built on Google Cloud Run (not Cloudflare Workers) so `coloradosun.com` DNS stays at Network Solutions with a plain CNAME, no zone delegation. Named `api.` rather than `data.` because it's intended to grow into the org's general-purpose public API surface, not stay Reddit-specific.
- **Notification payload pared to `post.created` / `post.failed`** — the gateway (and n8n behind it) only need enough to build Slack alerts, not the full item payload.

## Risks / gates to flag

- **App review on launch** is required for subs >200 members — budget review time into the rollout.
- **Domain allowlist review** — both the RSS host and n8n host get submitted to Reddit admins at upload; rejection blocks reach. Mitigation: pick an n8n host that is clearly the org's own (self-hosted on org domain, or n8n Cloud at a stable hostname), and do not treat Phase 6 as ready until both hosts show as approved in the Developer Portal.
- **`api.coloradosun.com` still needs its own allowlist pass** (Phase 8) — being a subdomain of the already-approved `coloradosun.com` should make this straightforward, but it is a distinct hostname to Reddit's reviewer and isn't automatically covered by the existing approval.
- **Cloud Run domain mapping requires Search Console ownership verification** for `coloradosun.com` before `api.coloradosun.com` can be mapped (Phase 7) — an easy step to forget; call it out explicitly in that phase's checklist.
- **T&C + Privacy Policy URLs are mandatory** before launch (because `fetch()` is used).
- **Production settings are still a launch gate** — the production RSS URL, n8n webhook URL, final comment template, and final icon all need to be in place before the first real post is expected.
- **30-second request ceiling** — pipeline isolates per-item work so partial progress survives the next tick.
- **App `name` is effectively one-shot** — it's the bot username and dev community slug; lock it in Phase 0.

## Default choices (override in `docs/phases/phase-0-prerequisites.md` if needed)

1. **Cron cadence**: `*/15 * * * *` (every 15 min).
2. **Posting identity**: app account, not "as installing mod".
3. **First-comment source**: static template with RSS-field substitution. LLM summary is a Phase-7 enhancement (`api.openai.com` is on Reddit's global fetch allowlist).

## Future expansion seams (Devvit-native, not built at MVP)

- **In-Reddit dashboard** (mod-only): add `post` config + `client/` webview + `/api/*` endpoints showing recent posts, errors, posting cadence.
- **Reply-to-comment bot**: add `triggers.onCommentCreate -> /internal/triggers/comment-create`.
- **Mod automation**: `triggers.onPostReport`, `onModAction`, plus per-post/per-comment menu items.
- **AI-assisted comments**: call `api.openai.com` (globally allowlisted) and store drafts in Redis for mod review before posting.
