# Phase 3 — Server implementation

**Goal**: the RSS pipeline submits posts and comments and notifies n8n.

**Prerequisites**: Phase 2 complete.

## Files to create

Match the layout in [../CONVENTIONS.md](../CONVENTIONS.md):

- `src/server/index.ts`
- `src/server/routes/cron.ts`
- `src/server/routes/menu.ts`
- `src/server/pipeline/rss.ts`
- `src/server/pipeline/templates.ts`
- `src/server/lib/log.ts`
- `src/server/lib/redis.ts`
- `src/server/lib/settings.ts`
- `src/shared/types.ts`

## Implementation outline

### `src/shared/types.ts`

```ts
export interface RssItem {
  guid: string;          // stable dedupe key; fall back to link if <guid> absent
  title: string;
  link: string;
  summary: string;
  publishedAt: string;   // ISO 8601
}

export interface WebhookPayload {
  postId: string;        // e.g. "t3_abc123"
  permalink: string;     // full reddit.com URL
  title: string;
  link: string;
  publishedAt: string;
  guid: string;
}

export interface AppSettings {
  rssUrl: string;
  n8nWebhookUrl: string;
  commentTemplate: string;
  enabled: boolean;
}
```

### `src/server/lib/log.ts`

```ts
type Level = "debug" | "info" | "warn" | "error";
type Status = "start" | "ok" | "skip" | "error";

interface LogArgs {
  level?: Level;
  op: string;
  status: Status;
  durationMs?: number;
  context?: Record<string, unknown>;
  error?: unknown;
}

export function log(args: LogArgs) {
  const entry = {
    ts: new Date().toISOString(),
    level: args.level ?? "info",
    phase: "3",
    op: args.op,
    status: args.status,
    ...(args.durationMs !== undefined && { durationMs: args.durationMs }),
    ...(args.context && { context: args.context }),
    ...(args.error && { error: serializeError(args.error) }),
  };
  // Devvit captures stdout; one JSON object per line.
  console.log(JSON.stringify(entry));
}

function serializeError(e: unknown) {
  if (e instanceof Error) return { name: e.name, message: e.message, stack: e.stack };
  return { value: String(e) };
}
```

Wrap every fallible op in a start/ok pair:

```ts
async function timed<T>(op: string, ctx: Record<string, unknown>, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  log({ op, status: "start", context: ctx });
  try {
    const result = await fn();
    log({ op, status: "ok", durationMs: Date.now() - t0, context: ctx });
    return result;
  } catch (error) {
    log({ level: "error", op, status: "error", durationMs: Date.now() - t0, context: ctx, error });
    throw error;
  }
}
```

### `src/server/lib/redis.ts`

```ts
import { redis } from "@devvit/server";

const SEEN_KEY = "rss:seen-guids";
const LAST_POLL_AT = "rss:last-poll-at";
const LAST_POLL_RESULT = "rss:last-poll-result";

export async function isSeen(guid: string): Promise<boolean> {
  return (await redis.sIsMember(SEEN_KEY, guid)) === 1;
}

export async function markSeen(guid: string): Promise<void> {
  await redis.sAdd(SEEN_KEY, guid);
}

export async function recordPoll(result: { ok: number; skipped: number; failed: number }): Promise<void> {
  await redis.set(LAST_POLL_AT, new Date().toISOString());
  await redis.set(LAST_POLL_RESULT, JSON.stringify(result));
}
```

### `src/server/pipeline/rss.ts`

The single function `runRssPipeline()` does the whole tick. Pseudocode:

```ts
export async function runRssPipeline(): Promise<{ ok: number; skipped: number; failed: number }> {
  const settings = await getSettings();
  if (!settings.enabled) {
    log({ op: "pipeline.run", status: "skip", context: { reason: "disabled" } });
    return { ok: 0, skipped: 0, failed: 0 };
  }

  const xml = await timed("rss.fetch", { url: settings.rssUrl }, () => fetchText(settings.rssUrl));
  const items = await timed("rss.parse", { byteLen: xml.length }, async () => parseRss(xml));

  let ok = 0, skipped = 0, failed = 0;
  for (const item of items) {
    try {
      if (await isSeen(item.guid)) { skipped++; continue; }
      const post = await timed("rss.submit-post", { guid: item.guid }, () =>
        reddit.submitPost({ subredditName, title: item.title, url: item.link }));
      await timed("rss.submit-comment", { postId: post.id }, () =>
        reddit.submitComment({ id: post.id, text: renderComment(item, settings.commentTemplate) }));
      await markSeen(item.guid);
      await timed("webhook.send", { postId: post.id }, () =>
        sendWebhook(settings.n8nWebhookUrl, { postId: post.id, permalink: post.permalink, ...item }));
      ok++;
    } catch (error) {
      failed++;
      log({ level: "error", op: "pipeline.item", status: "error", context: { guid: item.guid }, error });
    }
  }
  await recordPoll({ ok, skipped, failed });
  return { ok, skipped, failed };
}
```

### Routes

```ts
// src/server/routes/cron.ts
app.post("/internal/cron/poll-rss", async (c) => {
  const result = await runRssPipeline();
  return c.json(result);
});

// src/server/routes/menu.ts
app.post("/internal/menu/run-poll", async (c) => {
  const result = await runRssPipeline();
  return c.json({
    showToast: `Posted ${result.ok} · skipped ${result.skipped} · failed ${result.failed}`,
  });
});
```

## Acceptance criteria

`./scripts/verify.sh 3` passes:
- All files listed above exist
- `npx devvit build` exits 0
- No `console.log` outside `lib/log.ts`
- `runRssPipeline` is the only public export of `pipeline/rss.ts`

## Verification (manual)

1. Start `npm run dev` and `npx devvit logs | jq -c 'select(.op | startswith(\"rss.\") or startswith(\"webhook.\") or startswith(\"pipeline.\"))'` in two terminals.
2. Click the **"Run RSS poll now"** menu item in the test sub.
3. You should see start/ok pairs for `rss.fetch`, `rss.parse`, `rss.submit-post`, `rss.submit-comment`, `webhook.send`.
4. Posts appear in the test sub with the contextual first comment.
5. Click the menu item again → all items report `skipped` (dedupe works).
6. Webhook payload arrives at `n8nWebhookUrl` (use <https://webhook.site> for the first run).

## Troubleshooting

See [../DEBUGGING.md#phase-3---server-implementation](../DEBUGGING.md).

## Hand-off to Phase 4

Commit and update `docs/PHASE-STATUS.md`.
