#!/usr/bin/env bash
# Phase-specific verification for the Reddit RSS Auto-Poster.
#
# Usage:
#   ./scripts/verify.sh status      # print current phase status
#   ./scripts/verify.sh <0..6>      # run checks for that phase
#
# Exit codes:
#   0 — all checks for the given phase passed
#   1 — at least one check failed
#   2 — bad usage (unknown phase, missing tools, etc.)

set -u
IFS=$'\n\t'

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# --- output helpers ----------------------------------------------------------

PASS=0
FAIL=0
SKIP=0

green()  { printf "\033[32m%s\033[0m" "$1"; }
red()    { printf "\033[31m%s\033[0m" "$1"; }
yellow() { printf "\033[33m%s\033[0m" "$1"; }

pass() { PASS=$((PASS + 1)); printf "  [%s] %s\n" "$(green PASS)" "$1"; }
fail() { FAIL=$((FAIL + 1)); printf "  [%s] %s\n" "$(red FAIL)" "$1"; [ $# -ge 2 ] && printf "         %s\n" "$2"; }
skip() { SKIP=$((SKIP + 1)); printf "  [%s] %s\n" "$(yellow SKIP)" "$1"; [ $# -ge 2 ] && printf "         %s\n" "$2"; }
note() { printf "  • %s\n" "$1"; }

require() {
  # require <tool-name>: prints a warning + skips checks that need it
  if ! command -v "$1" >/dev/null 2>&1; then
    return 1
  fi
  return 0
}

# Check a bare hostname: lowercase letters/digits/dots/hyphens only; no protocol/path/trailing slash
is_bare_hostname() {
  local h="$1"
  [[ "$h" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]]
}

# --- phase definitions -------------------------------------------------------

phase_status() {
  if [ ! -f docs/PHASE-STATUS.md ]; then
    fail "docs/PHASE-STATUS.md not found"
    return
  fi
  cat docs/PHASE-STATUS.md
}

phase_0() {
  printf "\n== Phase 0 — Prerequisites ==\n"

  if [ ! -f phase-0.answers.md ]; then
    fail "phase-0.answers.md not found at repo root" \
         "Copy from phase-0.intake.md or run: cp phase-0.intake.md phase-0.answers.md  (gitignored)"
    return
  fi
  pass "phase-0.answers.md exists"

  if grep -q "<FILL IN>" phase-0.answers.md; then
    local unfilled
    unfilled=$(grep -c "<FILL IN>" phase-0.answers.md)
    fail "$unfilled unfilled field(s) remain in phase-0.answers.md" \
         "Run: grep -n '<FILL IN>' phase-0.answers.md"
  else
    pass "no <FILL IN> placeholders remain"
  fi

  # Extract hostname fields. The intake form uses literal lines like:
  #   - **RSS hostname**: example.com
  # Grep them with a tolerant regex.
  local found=0
  for label in "RSS hostname" "n8n hostname"; do
    local value
    value=$(grep -E "^- \*\*${label}\*\*:" phase-0.answers.md | sed -E "s/^- \*\*${label}\*\*:[[:space:]]*//" | head -n 1)
    if [ -z "$value" ] || [ "$value" = "<FILL IN>" ]; then
      fail "$label not set" "Edit phase-0.answers.md and set '- **${label}**: <value>'"
      continue
    fi
    if is_bare_hostname "$value"; then
      pass "$label is a bare hostname ($value)"
      found=$((found + 1))
    else
      fail "$label is not a bare hostname: '$value'" \
           "Devvit requires bare hostnames — strip protocol, path, and trailing slash."
    fi
  done
  [ $found -eq 2 ] && note "Remember: each hostname must be admin-approved at Reddit's end during Phase 6 launch."
}

phase_1() {
  printf "\n== Phase 1 — Scaffold ==\n"

  if [ ! -f package.json ]; then
    fail "package.json not found" "Phase 1 step 2–3: scaffold via developers.reddit.com/new and copy into repo root."
    return
  fi
  pass "package.json exists"

  if grep -q '"@devvit/web"' package.json; then
    pass "@devvit/web is a dependency"
  else
    fail "@devvit/web not listed in package.json" \
         "Current Devvit CLI (>=0.13) renamed @devvit/server to @devvit/web."
  fi

  if grep -E '"dev"\s*:\s*"devvit playtest r/' package.json >/dev/null; then
    pass "package.json#scripts.dev points to 'devvit playtest r/<sub>'"
  else
    fail "package.json#scripts.dev does not invoke 'devvit playtest r/<sub>'" \
         "Edit package.json and set: \"dev\": \"devvit playtest r/<your-test-sub>\""
  fi

  if grep -E '"build:server"' package.json | grep -q -- '--format=cjs'; then
    pass "server build script compiles to CommonJS (esbuild --format=cjs)"
  else
    fail "package.json#scripts.build:server does not target CommonJS" \
         "Devvit Web requires the server bundle to be CommonJS; build:server must include esbuild's --format=cjs flag."
  fi

  if [ -f tsconfig.json ]; then
    pass "tsconfig.json exists"
  else
    fail "tsconfig.json not found"
  fi

  if require node; then
    local v
    v=$(node --version | sed 's/^v//')
    local major minor
    major=${v%%.*}
    minor=$(echo "$v" | awk -F. '{print $2}')
    if [ "$major" -gt 22 ] || { [ "$major" -eq 22 ] && [ "$minor" -ge 6 ]; }; then
      pass "node version $v (>= 22.6.0)"
    else
      fail "node version $v is below 22.6.0" "nvm install 22 && nvm use 22"
    fi
  else
    skip "node not on PATH"
  fi

  if require npx; then
    if npx --no -- devvit whoami >/dev/null 2>&1; then
      pass "npx devvit whoami succeeds"
    else
      fail "npx devvit whoami failed" "Run: npx devvit login"
    fi
  else
    skip "npx not on PATH"
  fi
}

phase_2() {
  printf "\n== Phase 2 — devvit.json configuration ==\n"

  if [ ! -f devvit.json ]; then
    fail "devvit.json not found"
    return
  fi
  pass "devvit.json exists"

  if ! require jq; then
    skip "jq not on PATH — install jq to enable schema-level checks" \
         "brew install jq"
    # We can still do crude grep-based checks.
    grep -q '"poll-rss"' devvit.json && pass "scheduler entry 'poll-rss' present (grep)" || fail "scheduler entry 'poll-rss' missing (grep)"
    grep -q '"/internal/cron/poll-rss"' devvit.json && pass "cron endpoint string present (grep)" || fail "cron endpoint /internal/cron/poll-rss missing (grep)"
    grep -q '"/internal/menu/run-poll"' devvit.json && pass "menu endpoint string present (grep)" || fail "menu endpoint /internal/menu/run-poll missing (grep)"
    return
  fi

  if ! jq -e . devvit.json >/dev/null 2>&1; then
    fail "devvit.json is not valid JSON"
    return
  fi
  pass "devvit.json is valid JSON"

  local domains
  domains=$(jq -r '.permissions.http.domains[]?' devvit.json 2>/dev/null)
  if [ -z "$domains" ]; then
    fail "permissions.http.domains is empty or missing"
  else
    local count=0
    local bad=0
    while IFS= read -r d; do
      [ -z "$d" ] && continue
      count=$((count + 1))
      if ! is_bare_hostname "$d"; then
        fail "permissions.http.domains[] contains non-bare hostname: '$d'" \
             "Devvit rejects wildcards, protocols, and paths."
        bad=$((bad + 1))
      fi
    done <<< "$domains"
    if [ "$count" -ge 2 ] && [ "$bad" -eq 0 ]; then
      pass "permissions.http.domains has $count bare hostname(s)"
    elif [ "$count" -lt 2 ]; then
      fail "permissions.http.domains has $count entries (need at least 2: RSS host + n8n host)"
    fi
  fi

  local cron_ep
  cron_ep=$(jq -r '.scheduler.tasks["poll-rss"].endpoint // ""' devvit.json)
  if [ "$cron_ep" = "/internal/cron/poll-rss" ]; then
    pass "scheduler.tasks.poll-rss.endpoint = $cron_ep"
  else
    fail "scheduler.tasks.poll-rss.endpoint is '$cron_ep' (expected /internal/cron/poll-rss)"
  fi

  local cron_expr
  cron_expr=$(jq -r '.scheduler.tasks["poll-rss"].cron // ""' devvit.json)
  if [ -n "$cron_expr" ]; then
    pass "scheduler.tasks.poll-rss.cron = '$cron_expr'"
  else
    fail "scheduler.tasks.poll-rss.cron is empty"
  fi

  local menu_ep
  menu_ep=$(jq -r '.menu.items[]? | select(.endpoint == "/internal/menu/run-poll") | .endpoint' devvit.json)
  if [ "$menu_ep" = "/internal/menu/run-poll" ]; then
    pass "menu item with endpoint /internal/menu/run-poll exists"
  else
    fail "menu item /internal/menu/run-poll not found"
  fi

  local reddit_scope
  reddit_scope=$(jq -r '.permissions.reddit.scope // ""' devvit.json)
  if [ "$reddit_scope" = "moderator" ]; then
    pass "permissions.reddit.scope = moderator"
  else
    fail "permissions.reddit.scope = '$reddit_scope' (expected 'moderator')"
  fi

  if jq -e '.permissions.redis == true' devvit.json >/dev/null; then
    pass "permissions.redis = true"
  else
    fail "permissions.redis is not true"
  fi

  if [ -f assets/icon.png ]; then
    pass "assets/icon.png exists"
  else
    fail "assets/icon.png missing" "Drop a 1024x1024 PNG at assets/icon.png. Placeholder is OK for dev."
  fi

  note "Current Devvit CLI (0.13.9) has no build/validate-only command — 'devvit build' does not exist. For real end-to-end confirmation, run 'npx devvit playtest <test-sub>' manually (not scripted here; it's a long-running watch process)."
}

phase_3() {
  printf "\n== Phase 3 — Server implementation ==\n"

  local required=(
    "src/server/index.ts"
    "src/server/routes/cron.ts"
    "src/server/routes/menu.ts"
    "src/server/pipeline/rss.ts"
    "src/server/pipeline/templates.ts"
    "src/server/lib/log.ts"
    "src/server/lib/redis.ts"
    "src/server/lib/settings.ts"
    "src/shared/types.ts"
  )
  for f in "${required[@]}"; do
    if [ -f "$f" ]; then pass "$f exists"; else fail "$f missing"; fi
  done

  # console.log outside lib/log.ts
  if [ -d src ]; then
    local bad
    bad=$(grep -rn "console\.log" src --include="*.ts" 2>/dev/null | grep -v "src/server/lib/log.ts" || true)
    if [ -z "$bad" ]; then
      pass "no console.log outside src/server/lib/log.ts"
    else
      fail "console.log found outside src/server/lib/log.ts:" "$bad"
    fi
  fi

  # runRssPipeline exported
  if [ -f src/server/pipeline/rss.ts ]; then
    if grep -E "export\s+(async\s+)?function\s+runRssPipeline" src/server/pipeline/rss.ts >/dev/null; then
      pass "runRssPipeline exported from pipeline/rss.ts"
    else
      fail "runRssPipeline export not found in pipeline/rss.ts"
    fi
  fi

  note "Current Devvit CLI (0.13.9) has no build/validate-only command — 'devvit build' does not exist. For real end-to-end confirmation, run 'npx devvit playtest <test-sub>' manually (not scripted here; it's a long-running watch process)."
}

phase_4() {
  printf "\n== Phase 4 — App settings ==\n"

  if [ -f src/server/lib/settings.ts ]; then
    pass "src/server/lib/settings.ts exists"
    if grep -E "export\s+(async\s+)?function\s+getSettings" src/server/lib/settings.ts >/dev/null; then
      pass "getSettings exported"
    else
      fail "getSettings export not found"
    fi
  else
    fail "src/server/lib/settings.ts missing"
  fi

  if [ ! -f devvit.json ]; then
    fail "devvit.json not found (Phase 2 prerequisite)"
  elif ! require jq; then
    skip "jq not on PATH — install jq to enable schema-level checks" \
         "brew install jq"
    grep -q '"subreddit"' devvit.json && pass "settings.subreddit block present (grep)" || fail "settings.subreddit block missing (grep)"
  else
    local expected_fields=(rssUrl n8nWebhookUrl commentTemplate enabled)
    local missing=0
    for field in "${expected_fields[@]}"; do
      if jq -e --arg f "$field" '.settings.subreddit[$f] != null' devvit.json >/dev/null 2>&1; then
        pass "devvit.json#settings.subreddit.$field present"
      else
        fail "devvit.json#settings.subreddit.$field missing"
        missing=$((missing + 1))
      fi
    done

    local enabled_type
    enabled_type=$(jq -r '.settings.subreddit.enabled.type // ""' devvit.json)
    if [ "$enabled_type" = "boolean" ]; then
      pass "settings.subreddit.enabled.type = boolean"
    else
      fail "settings.subreddit.enabled.type is '$enabled_type' (expected 'boolean')"
    fi

    local template_type
    template_type=$(jq -r '.settings.subreddit.commentTemplate.type // ""' devvit.json)
    if [ "$template_type" = "paragraph" ]; then
      pass "settings.subreddit.commentTemplate.type = paragraph"
    else
      fail "settings.subreddit.commentTemplate.type is '$template_type' (expected 'paragraph')"
    fi
  fi

  note "Manual: change 'enabled' to false via the subreddit's app-settings surface, run the menu trigger, confirm 'pipeline.run status:skip' appears in 'npx devvit logs'."
  note "Manual: change commentTemplate, run trigger, confirm new template is reflected in the next post."
}


phase_5() {
  printf "\n== Phase 5 — Manual trigger + observability ==\n"

  if [ ! -f devvit.json ]; then
    fail "devvit.json not found (Phase 2 prerequisite)"
    return
  fi

  if require jq; then
    if jq -e '.menu.items[]? | select(.endpoint == "/internal/menu/dump-state")' devvit.json >/dev/null; then
      pass "menu item /internal/menu/dump-state exists"
    else
      fail "menu item /internal/menu/dump-state missing"
    fi
    if jq -e '.menu.items[]? | select(.endpoint == "/internal/menu/reset-dedupe")' devvit.json >/dev/null; then
      pass "menu item /internal/menu/reset-dedupe exists"
    else
      fail "menu item /internal/menu/reset-dedupe missing"
    fi
    if jq -e '.forms | to_entries[]? | select(.value == "/internal/form/reset-dedupe-confirm")' devvit.json >/dev/null; then
      pass "devvit.json#forms maps a form name to /internal/form/reset-dedupe-confirm"
    else
      fail "devvit.json#forms missing an entry mapping to /internal/form/reset-dedupe-confirm"
    fi
  else
    grep -q '"/internal/menu/dump-state"' devvit.json && pass "dump-state endpoint string present" || fail "dump-state endpoint missing"
    grep -q '"/internal/menu/reset-dedupe"' devvit.json && pass "reset-dedupe endpoint string present" || fail "reset-dedupe endpoint missing"
    grep -q '"/internal/form/reset-dedupe-confirm"' devvit.json && pass "reset-dedupe-confirm form endpoint string present" || fail "reset-dedupe-confirm form endpoint missing"
  fi

  if [ -f src/server/routes/menu.ts ]; then
    if grep -q "showForm" src/server/routes/menu.ts; then
      pass "reset-dedupe menu handler returns a showForm confirm"
    else
      fail "expected the reset-dedupe menu handler to return a showForm confirm before executing the reset"
    fi
  fi

  if [ -f src/server/pipeline/rss.ts ]; then
    if grep -E "op[[:space:]]*:[[:space:]]*['\"]pipeline\.run['\"]" src/server/pipeline/rss.ts >/dev/null; then
      pass "pipeline.run log line present in rss.ts"
    else
      fail "expected a pipeline.run log line at the end of runRssPipeline"
    fi
  fi
}

phase_6() {
  printf "\n== Phase 6 — Launch ==\n"

  if [ -f assets/icon.png ]; then
    local size
    if require stat; then
      # macOS: stat -f%z; GNU: stat -c%s. Try both.
      size=$(stat -f%z assets/icon.png 2>/dev/null || stat -c%s assets/icon.png 2>/dev/null || echo 0)
      if [ "$size" -ge 10000 ]; then
        pass "assets/icon.png is $size bytes (looks like a real icon, not a 1x1 stub)"
      else
        fail "assets/icon.png is only $size bytes" "Replace placeholder with a real 1024x1024 PNG before launch."
      fi
    else
      skip "stat unavailable"
    fi
  else
    fail "assets/icon.png missing"
  fi

  note "Manual: developers.reddit.com/apps/<name> — confirm App review status 'Approved' and Allowlisted domains both 'Approved'."
  note "Manual: smoke test with enabled=false then enabled=true in production sub."
}

# --- dispatcher --------------------------------------------------------------

usage() {
  cat <<EOF
Usage:
  $0 status         # show current phase status
  $0 <0..6>         # run checks for that phase

Exit code: 0 if all checks pass, 1 if any fail, 2 on bad usage.
EOF
}

main() {
  if [ "$#" -ne 1 ]; then usage; exit 2; fi

  case "$1" in
    status) phase_status ;;
    0) phase_0 ;;
    1) phase_1 ;;
    2) phase_2 ;;
    3) phase_3 ;;
    4) phase_4 ;;
    5) phase_5 ;;
    6) phase_6 ;;
    -h|--help) usage; exit 0 ;;
    *) usage; exit 2 ;;
  esac

  if [ "$1" != "status" ]; then
    printf "\nResult: %s pass · %s fail · %s skip\n" \
      "$(green "$PASS")" \
      "$([ "$FAIL" -gt 0 ] && red "$FAIL" || printf "%s" "$FAIL")" \
      "$([ "$SKIP" -gt 0 ] && yellow "$SKIP" || printf "%s" "$SKIP")"
    [ "$FAIL" -gt 0 ] && exit 1 || exit 0
  fi
}

main "$@"
