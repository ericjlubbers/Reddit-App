# Phase 0 — Prerequisites

**Goal**: collect every input and complete every admin/legal task that
later phases depend on, so implementation can run unblocked.

**Output**: a filled-in `phase-0.answers.md` (gitignored) and the required
external setup (T&C published, n8n webhook provisioned, etc.).

## Checklist

- [ ] **App name chosen** — 3–16 chars, `^[a-z][a-z0-9-]*$`. Becomes `u/<name>`, the dev community slug, and `devvit.json#name`. Effectively one-shot — pick carefully.
- [ ] **Target subreddit confirmed** — name, member count (>200 triggers Reddit app-review gate on launch), and confirmation we moderate it.
- [ ] **Terms & Conditions URL** — must be public on the org's domain. Required because the app uses `fetch()`.
- [ ] **Privacy Policy URL** — same requirement.
- [ ] **n8n webhook URL provisioned** — create a Webhook node in the target n8n workflow, copy its production URL. Note the *hostname* (needed for the fetch allowlist).
- [ ] **n8n hosting model noted** — self-hosted on org domain, or n8n Cloud. Affects domain-allowlist approval probability.
- [ ] **RSS feed URL + sample** — primary feed URL plus a fetched sample so we can confirm per-item `<guid>` or stable `<id>` exists for dedupe. Note the *hostname*.
- [ ] **Personal test subreddit** — a sub you moderate that we can point `devvit playtest` at during Phase 1+. A throwaway test sub is fine.
- [ ] **Reddit account linked to Reddit Developers** — visit <https://developers.reddit.com/new> and link an account. This becomes the publisher of record.
- [ ] **Decision overrides logged** — defaults in `docs/PLAN.md` (15-min cron, app-account identity, static comment template). If you want anything different, record it in `phase-0.answers.md`.

## Acceptance criteria

`./scripts/verify.sh 0` passes:
- `phase-0.answers.md` exists at repo root
- No line containing `<FILL IN>` remains
- The 4 hostname fields parse as bare hostnames (no protocol, no path, no trailing slash)

## Troubleshooting

- **"Reddit Developer Portal won't let me link my account"** → use a personal account first, then transfer the app or add the org account as a collaborator after launch.
- **"Our RSS feed doesn't have stable GUIDs"** → fall back to `<link>` as the dedupe key; flag this so Phase 3 sanitizes the URL (strip query strings, lowercase host) before keying.
- **"We don't have a Privacy Policy yet"** → blocking for launch but **not** for Phases 1–5. You can build and playtest the whole app without it; only `npm run launch` requires the URLs.
- **"Member count is just under 200, are we sure?"** → assume the worst (>200) and budget for app review; it's a few business days at most and we'd hit it eventually as the sub grows.

## Hand-off to Phase 1

When all checkboxes are ticked and `verify.sh 0` passes, update
[../PHASE-STATUS.md](../PHASE-STATUS.md): set Phase 0 to 🟩 and Phase 1 to 🟡.
