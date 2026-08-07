# Phase 8 — Notification payload + gateway rewiring

**Goal**: the Devvit app sends minimal, notification-only events (success and
error) to the `api.coloradosun.com` gateway via a shared secret, replacing
the current rich payload sent straight to n8n. n8n becomes just one
downstream consumer behind the gateway, used to design Slack notification
workflows.

**Prerequisites**: Phase 7 complete — gateway live at `api.coloradosun.com`,
`/route/reddit-rss` smoke-tested against real n8n.

## Changes

1. `devvit.json`:
   - `permissions.http.domains`: replace `coloradosun.app.n8n.cloud` with
     `api.coloradosun.com`.
   - `settings.subreddit.n8nWebhookUrl` → rename to `notificationWebhookUrl`
     (label: "Notification gateway URL"; default can now be the full,
     stable `https://api.coloradosun.com/route/reddit-rss`, unlike the old
     n8n webhook URL which had no safe default).
   - Add `settings.global.notificationSharedSecret`
     (`type: "string"`, `isSecret: true`) — this app's first use of a masked
     global setting (per-subreddit settings can't be marked `isSecret`, see
     Phase 4 drift notes).
2. `src/shared/types.ts`: replace `WebhookPayload` with a discriminated
   union `NotificationPayload`:
   ```ts
   export type NotificationPayload =
     | {
         event: 'post.created'
         title: string
         articleLink: string
         redditPermalink: string
         publishedAt: string
         postId: string
       }
     | {
         event: 'post.failed'
         op: string
         message: string
         guid?: string
         timestamp: string
       }
   ```
3. `src/server/lib/settings.ts`: read `notificationWebhookUrl` (subreddit)
   and `notificationSharedSecret` (global) into `AppSettings`.
4. `src/server/pipeline/rss.ts`:
   - Success path: build `post.created` from fields already available at
     the call site (`item`, `post`). Drop `guid` from the outbound payload —
     it's an internal dedupe key, not something Slack needs.
   - Per-item failure (existing inner `catch`): additionally send
     `post.failed` with `op: 'pipeline.item'`, `message: errorMessage(error)`,
     `guid: item.guid`. Today this path only logs; it needs to notify too.
   - Tick-level failure (existing outer `catch` around fetch/parse):
     additionally send `post.failed` with `op` set to whichever step threw
     (`rss.fetch` or `rss.parse`), `message`, no `guid`.
   - Rename `sendWebhook` → `sendNotification`; add an `X-Gateway-Secret`
     header sourced from `settings.notificationSharedSecret`.
5. `docs/DEBUGGING.md`: update the "Webhook payloads" row to point at Cloud
   Logging on the gateway service instead of `webhook.site`.

`src/server/lib/redis.ts` and the dump-state menu item need no changes —
neither stores or displays webhook payloads.

## Acceptance criteria

- A successful poll sends exactly the `post.created` fields to the gateway
  (verify via the gateway's Cloud Logging output or n8n's execution data).
- A forced failure (e.g., temporarily point `rssUrl` at a bad URL) produces
  a `post.failed` notification with diagnostic fields at the gateway.
- No remaining reference to `n8nWebhookUrl` or `coloradosun.app.n8n.cloud`
  anywhere in `src/` or `devvit.json`.
- `npm test` passes.

## Troubleshooting

- `401` from the gateway → `notificationSharedSecret` global setting hasn't
  been saved yet for this install. Global settings live in a separate panel
  from per-subreddit settings in the Developer Portal — confirm you're
  editing the right one.
- Notification silently missing on a failed tick → confirm the outer
  `catch` in `runRssPipeline` now calls `sendNotification` before it
  `throw`s (today it only logs).

## Hand-off to Phase 9

With the payload pared back and the gateway wired in, Phase 9 cleans up the
README to describe actual behavior only.
