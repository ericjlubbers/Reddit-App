import type {UiResponse} from '@devvit/web/shared'
import {FormName} from '../../shared/api.ts'
import {log} from '../lib/log.ts'
import {countSeen, getLastPoll, resetSeen} from '../lib/redis.ts'
import {runRssPipeline} from '../pipeline/rss.ts'

export async function routeRunPoll(): Promise<UiResponse> {
  const result = await runRssPipeline()
  return {
    showToast: `Posted ${result.ok} · skipped ${result.skipped} · failed ${result.failed}`,
  }
}

export async function routeDumpState(): Promise<UiResponse> {
  const [seenCount, lastPoll] = await Promise.all([countSeen(), getLastPoll()])
  const pollText = lastPoll.at
    ? `last poll ${lastPoll.at} (ok ${lastPoll.result?.ok ?? 0} · skipped ${lastPoll.result?.skipped ?? 0} · failed ${lastPoll.result?.failed ?? 0})`
    : 'no poll yet'
  return {
    showToast: `Seen ${seenCount} · ${pollText}`,
  }
}

export function routeResetDedupeConfirm(): UiResponse {
  return {
    showForm: {
      name: FormName.ResetDedupeConfirm,
      form: {
        title: 'Reset dedupe state?',
        description:
          'This clears rss:seen-guids. Previously-posted items may be reposted on the next poll.',
        fields: [],
        acceptLabel: 'Reset',
        cancelLabel: 'Cancel',
      },
    },
  }
}

export async function routeResetDedupeSubmit(): Promise<UiResponse> {
  await resetSeen()
  log({op: 'redis.reset-seen', status: 'ok'})
  return {showToast: 'Dedupe state reset · rss:seen-guids cleared'}
}
