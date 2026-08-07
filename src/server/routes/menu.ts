import type {UiResponse} from '@devvit/web/shared'
import {FormName} from '../../shared/api.ts'
import {formatRelativeTime, friendlyPipelineError} from '../lib/format.ts'
import {log} from '../lib/log.ts'
import {countSeen, getLastPoll, resetSeen} from '../lib/redis.ts'
import {runRssPipeline} from '../pipeline/rss.ts'

export async function routeRunPoll(): Promise<UiResponse> {
  try {
    const result = await runRssPipeline()
    return {
      showToast: `Posted ${result.ok} · skipped ${result.skipped} · failed ${result.failed}`,
    }
  } catch (error) {
    // runRssPipeline() already logs the error before rethrowing; this just
    // turns it into a message staff can act on instead of Reddit's generic
    // "Something has gone wrong" toast.
    return {showToast: friendlyPipelineError(error)}
  }
}

export async function routeDumpState(): Promise<UiResponse> {
  const [seenCount, lastPoll] = await Promise.all([countSeen(), getLastPoll()])
  const lastPollText = lastPoll.at ? formatRelativeTime(lastPoll.at) : 'never'
  const lastResultText = lastPoll.result
    ? `ok ${lastPoll.result.ok} · skipped ${lastPoll.result.skipped} · failed ${lastPoll.result.failed}`
    : lastPoll.error
      ? 'failed (see error below)'
      : 'n/a'

  return {
    showForm: {
      name: FormName.DumpStateView,
      form: {
        title: 'RSS bot status',
        acceptLabel: 'Close',
        fields: [
          {
            type: 'string',
            name: 'seenCount',
            label: 'Items remembered (dedupe count)',
            defaultValue: String(seenCount),
            disabled: true,
          },
          {
            type: 'string',
            name: 'lastPoll',
            label: 'Last poll attempt',
            defaultValue: lastPollText,
            disabled: true,
          },
          {
            type: 'string',
            name: 'lastResult',
            label: 'Last result',
            defaultValue: lastResultText,
            disabled: true,
          },
          {
            type: 'paragraph',
            name: 'lastError',
            label: 'Last error (if any)',
            defaultValue: lastPoll.error ?? 'none',
            disabled: true,
          },
        ],
      },
    },
  }
}

export async function routeDumpStateViewClose(): Promise<UiResponse> {
  return {}
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
