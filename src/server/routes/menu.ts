import type {UiResponse} from '@devvit/web/shared'
import {runRssPipeline} from '../pipeline/rss.ts'

export async function routeRunPoll(): Promise<UiResponse> {
  const result = await runRssPipeline()
  return {
    showToast: `Posted ${result.ok} · skipped ${result.skipped} · failed ${result.failed}`,
  }
}
