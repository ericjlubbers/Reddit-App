import {context, reddit} from '@devvit/web/server'
import {XMLParser} from 'fast-xml-parser'
import type {RssItem, WebhookPayload} from '../../shared/types.ts'
import {decodeHtmlEntities} from '../lib/format.ts'
import {log, timed} from '../lib/log.ts'
import {
  isSeen,
  markSeen,
  type PollResult,
  recordFailure,
  recordPoll,
} from '../lib/redis.ts'
import {getSettings} from '../lib/settings.ts'
import {renderComment} from './templates.ts'

const RSS_USER_AGENT =
  'Mozilla/5.0 (compatible; coloradosun-bot/1.0; +https://coloradosun.com)'

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

export async function runRssPipeline(): Promise<PollResult> {
  const settings = await getSettings()
  if (!settings.enabled) {
    log({op: 'pipeline.run', status: 'skip', context: {reason: 'disabled'}})
    return {ok: 0, skipped: 0, failed: 0}
  }

  try {
    const xml = await timed('rss.fetch', {url: settings.rssUrl}, () =>
      fetchText(settings.rssUrl),
    )
    const items = await timed('rss.parse', {byteLen: xml.length}, () =>
      Promise.resolve(parseRss(xml)),
    )

    let ok = 0
    let skipped = 0
    let failed = 0
    for (const item of items) {
      try {
        if (await isSeen(item.guid)) {
          skipped++
          continue
        }
        const post = await timed('rss.submit-post', {guid: item.guid}, () =>
          reddit.submitPost({
            subredditName: context.subredditName,
            title: item.title,
            url: item.link,
          }),
        )
        await timed('rss.submit-comment', {postId: post.id}, () =>
          reddit.submitComment({
            id: post.id,
            text: renderComment(item, settings.commentTemplate),
          }),
        )
        await markSeen(item.guid)
        const payload: WebhookPayload = {
          postId: post.id,
          permalink: `https://www.reddit.com${post.permalink}`,
          title: item.title,
          link: item.link,
          publishedAt: item.publishedAt,
          guid: item.guid,
        }
        await timed('webhook.send', {postId: post.id}, () =>
          sendWebhook(settings.n8nWebhookUrl, payload),
        )
        ok++
      } catch (error) {
        failed++
        log({
          level: 'error',
          op: 'pipeline.item',
          status: 'error',
          context: {guid: item.guid},
          error,
        })
      }
    }

    const result: PollResult = {ok, skipped, failed}
    await recordPoll(result)
    log({op: 'pipeline.run', status: 'ok', context: {...result}})
    return result
  } catch (error) {
    await recordFailure(error)
    log({level: 'error', op: 'pipeline.run', status: 'error', error})
    throw error
  }
}

async function fetchText(url: string): Promise<string> {
  const rsp = await fetch(url, {headers: {'User-Agent': RSS_USER_AGENT}})
  if (!rsp.ok) throw new Error(`rss fetch responded ${rsp.status}`)
  return rsp.text()
}

function parseRss(xml: string): RssItem[] {
  const doc = xmlParser.parse(xml)
  const rawItems: unknown = doc?.rss?.channel?.item
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : []
  const result: RssItem[] = []
  for (const raw of items) {
    const item = toRssItem(raw)
    if (item) result.push(item)
  }
  return result
}

function toRssItem(raw: unknown): RssItem | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const fields = raw as Record<string, unknown>
  const link = textOf(fields.link)
  if (!link) return undefined
  const guid = textOf(fields.guid) ?? link
  const pubDate = textOf(fields.pubDate)
  const publishedAt = pubDate
    ? new Date(pubDate).toISOString()
    : new Date().toISOString()
  return {
    guid,
    title: decodeHtmlEntities(textOf(fields.title) ?? ''),
    link,
    summary: decodeHtmlEntities(textOf(fields.description) ?? ''),
    publishedAt,
  }
}

function textOf(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  if (typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && '#text' in value) {
    return textOf((value as Record<string, unknown>)['#text'])
  }
  return undefined
}

async function sendWebhook(
  url: string,
  payload: WebhookPayload,
): Promise<void> {
  const rsp = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  })
  if (!rsp.ok) throw new Error(`webhook responded ${rsp.status}`)
}
