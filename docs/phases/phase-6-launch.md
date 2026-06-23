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
4. Wait. Reddit reviews app + domains independently. Both must pass before install.
5. Once approved, install the app from the Developer Portal app page onto the production subreddit.
6. In the production subreddit's app settings panel, fill in:
   - `rssUrl` (production RSS feed)
   - `n8nWebhookUrl` (production n8n webhook)
   - `commentTemplate` (final template approved by editorial)
   - `enabled` (leave **false** for smoke test, flip to **true** when ready)
7. **Smoke test**: with `enabled: false`, click "Run RSS poll now" — confirms wiring without posting. Then flip `enabled: true` and click again. One real post should appear in the production sub.
8. Wait for the next natural cron tick (≤15 min) to confirm scheduled execution.

## Acceptance criteria

- App appears at `https://developers.reddit.com/apps/<name>` with status **Approved**.
- Allowlisted domains list includes both the RSS host and the n8n host with status **Approved**.
- One real RSS post + comment + n8n webhook arrival has been observed end-to-end.

## Risks at this stage

- **Allowlist domain denied** — contact Reddit dev support; reference your org's RSS feed as a clear justification.
- **App review denied** — typical fixes: clearer description, valid T&C/Privacy URLs, higher-quality icon.
- **Production subreddit member count >200** — same review applies; this is the normal path.

## After launch

Mark Phase 6 🟩 in `docs/PHASE-STATUS.md` and capture any post-launch fixes
as bug reports per [../DEBUGGING.md#how-to-capture-a-bug-report](../DEBUGGING.md).
