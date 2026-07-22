import type {PollRssRsp} from '../../shared/api.ts'
import {runRssPipeline} from '../pipeline/rss.ts'

export async function routePollRss(): Promise<PollRssRsp> {
  return runRssPipeline()
}
