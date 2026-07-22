/** One parsed entry from the RSS feed. */
export interface RssItem {
  /** Stable dedupe key; falls back to `link` if `<guid>` is absent. */
  guid: string
  title: string
  link: string
  summary: string
  /** ISO 8601. */
  publishedAt: string
}

/** Payload sent to the n8n webhook after a successful post + comment. */
export interface WebhookPayload {
  /** e.g. "t3_abc123". */
  postId: string
  /** Full reddit.com URL. */
  permalink: string
  title: string
  link: string
  publishedAt: string
  guid: string
}

export interface AppSettings {
  rssUrl: string
  n8nWebhookUrl: string
  commentTemplate: string
  enabled: boolean
}
