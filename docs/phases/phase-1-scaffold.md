# Phase 1 — Scaffold

**Goal**: a Devvit Web app skeleton that runs in playtest on a personal test
subreddit.

**Prerequisites**: Phase 0 #1 (app name), #8 (personal test sub), #9 (Reddit
account linked to Devvit).

> **Tooling note (2026-07):** as of `devvit`/`@devvit/web` 0.13.x, the wizard's
> template previously called **Hello World** is now named **Bare**, and the
> server package previously called `@devvit/server` is now `@devvit/web`. The
> steps and acceptance criteria below reflect the current CLI, not the
> original Hello-World-era naming.

## Steps

1. `node --version` → confirm `>= 22.6.0` (the scaffolded template's `package.json#engines.node` requirement). If not, install via nvm: `nvm install 22 && nvm use 22`.
2. Run `npx devvit login` (one-time, skip if `npx devvit whoami` already succeeds). Follow the browser prompt to authorize as the Reddit account from Phase 0 #9.
3. Scaffold in a scratch directory (the repo root already has files, and `devvit new` expects an empty directory): `mkdir -p /tmp/<app-name>-scaffold && cd /tmp/<app-name>-scaffold && npx devvit new --template bare`. This opens a one-time browser prompt to create/name the app on developers.reddit.com — use the app name from Phase 0 #1. The CLI fetches the template, installs dependencies, and reports success.
4. Move/copy the scaffolded contents (everything except `.git/`) into this repo root, **preserving the existing `docs/`, `scripts/`, `README.md`, `.gitignore`, and `phase-0.answers.md`**. Resolve any conflict in favor of the existing files in this repo.
5. In the scaffolded `package.json`, add/rename a `dev` script:
   ```json
   "dev": "devvit playtest r/<personal-test-sub>"
   ```
   Where `<personal-test-sub>` is from Phase 0 #8.
6. Run `npm install`.
7. Run `npm run dev`. Expected output ends with a "Playtest ready" banner and a `r/<name>_dev` URL.

## Acceptance criteria

`./scripts/verify.sh 1` passes:
- `package.json` exists and lists `@devvit/web` as a dependency
- `package.json#scripts.dev` invokes `devvit playtest r/...`
- `package.json#scripts.build:server` targets CommonJS output (esbuild `--format=cjs`) — this is how Devvit Web enforces a CJS server bundle in the current template, not `tsconfig.json#module`
- `tsconfig.json` exists
- `node --version` ≥ 22.6.0
- `npx devvit whoami` exits 0

## Verification (manual)

1. With `npm run dev` running, open the printed `r/<name>_dev` URL.
2. You should see the Hello World post render inside Reddit.
3. The CLI log should show a heartbeat every few seconds with no errors.

## Troubleshooting

- **"Not authenticated"** → `npx devvit login` and re-run.
- **"Subreddit not found"** → the personal test sub must already exist; create it at <https://reddit.com/subreddits/create>.
- **`devvit new --template hello-world` says "not a valid template"** → the current CLI calls it `bare` (see the tooling note above). Use `npx devvit new --template bare`.
- **Build errors mentioning ESM/CJS** → check `package.json#scripts.build:server` includes esbuild's `--format=cjs` flag and that the server bundle output is `.cjs`. Do not force `tsconfig.json#module` to `"commonjs"` — the current template's TS source is ESM/bundler-style and CJS is produced at the esbuild step, not by tsconfig.
- **`npm run dev` hangs** → known issue with stale `.devvit-cache`; delete it and retry.

## Hand-off to Phase 2

Commit the scaffold and update `docs/PHASE-STATUS.md`.
