import {redis} from '@devvit/web/server'
import {errorMessage} from './format.ts'

const SEEN_KEY = 'rss:seen-guids'
const LAST_POLL_AT = 'rss:last-poll-at'
const LAST_POLL_RESULT = 'rss:last-poll-result'
const LAST_POLL_ERROR = 'rss:last-poll-error'

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
  await redis.del(LAST_POLL_ERROR)
}

export async function recordFailure(error: unknown): Promise<void> {
  await redis.set(LAST_POLL_AT, new Date().toISOString())
  await redis.set(LAST_POLL_ERROR, errorMessage(error))
  await redis.del(LAST_POLL_RESULT)
}

export interface LastPoll {
  at: string | undefined
  result: PollResult | undefined
  error: string | undefined
}

export async function getLastPoll(): Promise<LastPoll> {
  const [at, rawResult, error] = await Promise.all([
    redis.get(LAST_POLL_AT),
    redis.get(LAST_POLL_RESULT),
    redis.get(LAST_POLL_ERROR),
  ])
  const result = rawResult ? (JSON.parse(rawResult) as PollResult) : undefined
  return {at, result, error}
}

export async function countSeen(): Promise<number> {
  return redis.hLen(SEEN_KEY)
}

export async function resetSeen(): Promise<void> {
  await redis.del(SEEN_KEY)
}
