# Phase 1 — Scaffold

**Goal**: a Devvit Web app skeleton that runs in playtest on a personal test
subreddit.

**Prerequisites**: Phase 0 #1 (app name), #8 (personal test sub), #9 (Reddit
account linked to Devvit).

## Steps

1. `node --version` → confirm `>= 22.2.0`. If not, install via nvm: `nvm install 22 && nvm use 22`.
2. Visit <https://developers.reddit.com/new>, choose the **Hello World** template (no webview at MVP). Use the app name from Phase 0.
3. The wizard scaffolds a project. Move/copy its contents into this repo root, **preserving the existing `docs/`, `scripts/`, `README.md`, and `.gitignore`**. Resolve any conflict in favor of the existing files in this repo.
4. In the scaffolded `package.json`, change the `dev` script:
   ```json
   "dev": "devvit playtest r/<personal-test-sub>"
   ```
   Where `<personal-test-sub>` is from Phase 0 #8.
5. Run `npm install`.
6. Run `npx devvit login` (one-time). Follow the browser prompt.
7. Run `npm run dev`. Expected output ends with a "Playtest ready" banner and a `r/<name>_dev` URL.

## Acceptance criteria

`./scripts/verify.sh 1` passes:
- `package.json` exists and lists `@devvit/server` as a dependency
- `package.json#scripts.dev` invokes `devvit playtest r/...`
- `tsconfig.json` exists with `"module": "commonjs"`
- `node --version` ≥ 22.2.0
- `npx devvit whoami` exits 0

## Verification (manual)

1. With `npm run dev` running, open the printed `r/<name>_dev` URL.
2. You should see the Hello World post render inside Reddit.
3. The CLI log should show a heartbeat every few seconds with no errors.

## Troubleshooting

- **"Not authenticated"** → `npx devvit login` and re-run.
- **"Subreddit not found"** → the personal test sub must already exist; create it at <https://reddit.com/subreddits/create>.
- **Build errors mentioning ESM/CJS** → check `tsconfig.json#module === "commonjs"` and that the server bundle output is `.cjs`.
- **`npm run dev` hangs** → known issue with stale `.devvit-cache`; delete it and retry.

## Hand-off to Phase 2

Commit the scaffold and update `docs/PHASE-STATUS.md`.
