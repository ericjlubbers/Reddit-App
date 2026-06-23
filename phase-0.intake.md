# Phase 0 intake (template)

> **Instructions**: copy this file to `phase-0.answers.md` and fill in each
> `<FILL IN>` placeholder, then run `./scripts/verify.sh 0`. The file
> `phase-0.answers.md` is gitignored — your answers stay local.
>
> ```bash
> cp phase-0.intake.md phase-0.answers.md
> $EDITOR phase-0.answers.md
> ./scripts/verify.sh 0
> ```
>
> Field labels in **bold** are parsed by `verify.sh`. Don't rename them.

---

## App identity

- **App name**: <FILL IN>
  - 3–16 chars, `^[a-z][a-z0-9-]*$`. Becomes `u/<name>`, the Devvit community slug, and `devvit.json#name`. Effectively one-shot.
- **Production subreddit**: r/<FILL IN>
- **Production subreddit member count (approx)**: <FILL IN>
  - If >200, expect Reddit app review on launch.
- **Personal test subreddit (you moderate)**: r/<FILL IN>
  - Used as the `devvit playtest` target during dev. A throwaway sub is fine.

## Reddit Developer account

- **Reddit account linked to Reddit Developers**: u/<FILL IN>
- **Account also moderates the production sub?**: <FILL IN>  (yes / no — if no, plan a mod handoff)

## RSS feed

- **RSS feed URL**: <FILL IN>
- **RSS hostname**: <FILL IN>
  - **Must be a bare hostname** — no `https://`, no path, no trailing slash. Example: `coloradosun.com`.
- **Items have stable `<guid>` or `<id>`?**: <FILL IN>  (yes / no / unknown — if no, we'll fall back to normalized `<link>` as the dedupe key)

## n8n target

- **n8n hosting**: <FILL IN>  (self-hosted on org domain / n8n Cloud / other)
- **n8n webhook URL**: <FILL IN>
  - Provision the Webhook node in your n8n workflow and paste the production URL here.
- **n8n hostname**: <FILL IN>
  - **Must be a bare hostname.** Same rules as the RSS hostname.

## Legal (required for `npm run launch`, not for playtest)

- **Terms & Conditions URL**: <FILL IN>
- **Privacy Policy URL**: <FILL IN>

> Status if not yet published: `pending — will publish before Phase 6`. Phases 1–5 don't need these, but Phase 6 does.

## Overrides to defaults

Defaults are documented in `docs/PLAN.md`. Override here only if you want
something different from the recommended choice.

- **Cron cadence** (default `*/15 * * * *`): <FILL IN or "default">
- **Posting identity** (default `app account`): <FILL IN or "default">
  - Alternative: `installing mod` (`permissions.reddit.asUser: ["SUBMIT_POST","SUBMIT_COMMENT"]`)
- **First-comment source** (default `static template`): <FILL IN or "default">
  - Alternatives: `RSS description verbatim` · `LLM summary via api.openai.com (Phase 7+)`
- **Static comment template** (used when first-comment source is `static template`):

  ```text
  <FILL IN — your template. Placeholders supported: {title}, {link}, {summary}, {publishedAt}>
  ```

## Sign-off

- **Filled out by**: <FILL IN>
- **Date**: <FILL IN>
- **Anything else to flag**: <FILL IN or "none">
