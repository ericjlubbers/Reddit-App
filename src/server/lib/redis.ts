import {redis} from '@devvit/web/server'

const SEEN_KEY = 'rss:seen-guids'
const LAST_POLL_AT = 'rss:last-poll-at'
const LAST_POLL_RESULT = 'rss:last-poll-result'

export interface PollResult {
  ok: number
  skipped: number
  failed: number
}

// Note: the current @devvit/redis client has no Set commands (no sAdd/
// sIsMember) — only strings, hashes, and sorted sets. A hash keyed by guid
// (value = the timestamp it was first seen) emulates set membership.

export async function isSeen(guid: string): Promise<boolean> {
  return (await redis.hGet(SEEN_KEY, guid)) !== undefined
}

export async function markSeen(guid: string): Promise<void> {
  await redis.hSet(SEEN_KEY, {[guid]: new Date().toISOString()})
}

export async function recordPoll(result: PollResult): Promise<void> {
  await redis.set(LAST_POLL_AT, new Date().toISOString())
  await redis.set(LAST_POLL_RESULT, JSON.stringify(result))
}
