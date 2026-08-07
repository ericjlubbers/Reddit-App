# Phase 6 — Launch

**Goal**: app is reviewed and approved by Reddit, installed on the production
subreddit, configured with real settings, and producing posts.

**Prerequisites**: Phases 1–5 complete; Phase 0 #2 (subreddit), #3 (T&C URL),
#4 (n8n webhook URL).

## Steps

1. Replace the placeholder `assets/icon.png` with a final 1024×1024 PNG.
2. In the Developer Portal app details, fill in:
   - App description
   - **Terms & Conditions URL** (from Phase 0 #3)
   - **Privacy Policy URL** (from Phase 0 #3)
3. Run `npm run launch`. This uploads the bundle for Reddit review and submits the requested allowlist domains for admin approval.
4. Confirm the Developer Portal shows both required hosts as approved under the app's allowlisted domains list before attempting a production install. The two hosts to verify are the RSS host and the n8n host; if either is denied, treat that as a launch blocker and contact Reddit dev support with a clear justification that the host is the news org's own feed or webhook endpoint.
5. Wait. Reddit reviews app + domains independently. Both must pass before install.
6. Once approved, install the app from the Developer Portal app page onto the production subreddit.
7. In the production subreddit's app settings panel, fill in:
   - `rssUrl` (production RSS feed)
   - `n8nWebhookUrl` (production n8n webhook)
   - `commentTemplate` (final template approved by editorial)
   - `enabled` (leave **false** for smoke test, flip to **true** when ready)
8. **Smoke test**: with `enabled: false`, click "Run RSS poll now" — confirms wiring without posting. Then flip `enabled: true` and click again. One real post should appear in the production sub.
9. Wait for the next natural cron tick (≤15 min) to confirm scheduled execution.

## Acceptance criteria

- App appears at `https://developers.reddit.com/apps/<name>` with status **Approved**.
- Allowlisted domains list includes both the RSS host and the n8n host with status **Approved**.
- One real RSS post + comment + n8n webhook arrival has been observed end-to-end.

## Maximizing allowlist approval odds

Reddit reviews requested domains alongside the app bundle. Domain exceptions are per-app, must be exact hostnames, and are typically reviewed in 1–2 business days unless there is policy ambiguity. To reduce ambiguity for `coloradosun-bot`:

1. **Keep the app listing complete and professional.** The app description, Terms & Conditions URL, and Privacy Policy URL should already be saved in the Developer Portal before the domain request is considered. These fields are mandatory for any app that uses `fetch()`.
2. **Remove stale or debug-only domains from the request.** If the portal still shows `webhook.site` (or any other transient debugging host) as pending, contact Reddit dev support via the app page's **Send feedback** link and ask them to drop it. Explain that the production app only needs the org-owned domains.
3. **Justify both remaining domains clearly.** When contacting support, state that `coloradosun.com` is the news org's own RSS feed host and `coloradosun.app.n8n.cloud` is its own n8n Cloud automation endpoint. Both are controlled by The Colorado Sun.
4. **Prefer org-owned hostnames when possible.** If you can route the n8n webhook through a domain you control — e.g., `webhooks.coloradosun.com` or `n8n.coloradosun.com` proxying to the n8n Cloud instance — then `devvit.json` only needs `coloradosun.com`. A single org-owned domain is usually easier to approve than a third-party `*.app.n8n.cloud` hostname.
5. **Replace the placeholder icon before the next upload.** A real 1024×1024 icon signals a serious app to a human reviewer and is required for launch acceptance.
6. **Upload only when the domain list is final.** Re-uploading resubmits the entire domain request, so avoid churn while a request is pending. Clean up the listing first, then run `npm run launch` once.

## Risks at this stage

- **Allowlist domain denied** — contact Reddit dev support; reference your org's RSS feed as a clear justification.
- **App review denied** — typical fixes: clearer description, valid T&C/Privacy URLs, higher-quality icon.
- **Production subreddit member count >200** — same review applies; this is the normal path.

## After launch

Mark Phase 6 🟩 in `docs/PHASE-STATUS.md` and capture any post-launch fixes
as bug reports per [../DEBUGGING.md#how-to-capture-a-bug-report](../DEBUGGING.md).
