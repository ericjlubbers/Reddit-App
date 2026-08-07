# Phase 9 — README cleanup

**Goal**: `README.md` describes what the app actually does today, with no
stale references to the old n8n domain, the dev/test subreddit, or
marketing-ish framing that doesn't describe app behavior.

**Prerequisites**: Phase 8 complete — payload and domains already changed in
code, so the README can describe the real, current wiring rather than a
target state.

## Steps

1. **Fetch Domains section**: keep the `coloradosun.com` entry as-is
   (justification unchanged). Replace the `coloradosun.app.n8n.cloud` entry
   with `api.coloradosun.com`, justification along the lines of: "The org's
   own API gateway. After each poll, the app sends a minimal success/error
   notification here, which the gateway routes to internal workflows (e.g.
   Slack alerts). No third-party or consumer-facing domain is contacted
   directly by this app."
2. Grep the README for any remaining mentions of `coloradosun_dev` or other
   test/dev-subreddit references and remove them — the README should
   describe the production app.
3. Trim the opening paragraph: keep the one-line "no Reddit Data API
   approval needed" fact; drop historical color (e.g. the "Nov-2025
   self-service closure" detail) that doesn't describe what the app does.
4. **Quick orientation** bullets: replace the "n8n integration" bullet with
   something like "**Notifications**: after each poll, sends a minimal
   success/error event to the org's `api.coloradosun.com` gateway".
5. Leave "Where to look" and "Working on this repo" sections as-is — still
   accurate.

## Acceptance criteria

- `grep -ri "n8n.cloud\|coloradosun_dev" README.md` returns nothing.
- The README's Fetch Domains section lists exactly `coloradosun.com` and
  `api.coloradosun.com`, each with a justification describing what the app
  actually contacts it for.

## Hand-off

Mark Phase 9 done in `docs/PHASE-STATUS.md`. This closes out the
notification-gateway workstream (Phases 7–9).
