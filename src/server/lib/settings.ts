import {settings} from '@devvit/web/server'
import type {AppSettings} from '../../shared/types.ts'

// Defaults confirmed in phase-0.answers.md. devvit.json#settings.subreddit
// (Phase 4) defines the schema/UI a mod sees; these are the fallback values
// used until a mod saves their own, and for any field not yet configured on
// a fresh install. Deliberately default-fallback rather than throw-on-missing
// (see docs/PHASE-STATUS.md Phase 4 notes for the reasoning) — a fresh
// install must not hard-fail before the mod has touched settings.
const DEFAULT_RSS_URL = 'https://coloradosun.com/feed/?partner-feed=reddit-rss'
const DEFAULT_COMMENT_TEMPLATE = '{summary}\n\n— Read more at {link}'
const DEFAULT_ENABLED = true
const DEFAULT_N8N_WEBHOOK_URL = ''

export async function getSettings(): Promise<AppSettings> {
  const values = await settings.getAll()
  return {
    rssUrl: readString(values, 'rssUrl') ?? DEFAULT_RSS_URL,
    n8nWebhookUrl:
      readString(values, 'n8nWebhookUrl') ?? DEFAULT_N8N_WEBHOOK_URL,
    commentTemplate:
      readString(values, 'commentTemplate') ?? DEFAULT_COMMENT_TEMPLATE,
    enabled: readBoolean(values, 'enabled') ?? DEFAULT_ENABLED,
  }
}

function readString(
  values: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = values[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function readBoolean(
  values: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const value = values[key]
  return typeof value === 'boolean' ? value : undefined
}
