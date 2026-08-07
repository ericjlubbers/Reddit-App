/** Generic error detail for all responses. */
export type ErrorRsp = {error: string; status: number}

/** The current counter state for this post. */
export type GetCounterRsp = {count: number}

/** Increment the post counter by a signed amount. */
export type IncCounterReq = {amount: number}
export type IncCounterRsp = {count: number}

/** Result of one RSS-pipeline tick. */
export type PollRssRsp = {ok: number; skipped: number; failed: number}

export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint]
export const Endpoint = {
  GetCounter: 'api/counter',
  IncCounter: 'api/counter/inc',
  OnAppInstall: 'internal/on/app/install',
  OnMenuNewPost: 'internal/on/menu/new-post',
  PollRss: 'internal/cron/poll-rss',
  RunPoll: 'internal/menu/run-poll',
  DumpState: 'internal/menu/dump-state',
  ResetDedupe: 'internal/menu/reset-dedupe',
  ResetDedupeConfirm: 'internal/form/reset-dedupe-confirm',
  DumpStateViewClose: 'internal/form/dump-state-view-close',
} as const

export const EndpointMethod = {
  [Endpoint.GetCounter]: 'GET',
  [Endpoint.IncCounter]: 'POST',
  [Endpoint.OnAppInstall]: 'POST',
  [Endpoint.OnMenuNewPost]: 'POST',
  [Endpoint.PollRss]: 'POST',
  [Endpoint.RunPoll]: 'POST',
  [Endpoint.DumpState]: 'POST',
  [Endpoint.ResetDedupe]: 'POST',
  [Endpoint.ResetDedupeConfirm]: 'POST',
  [Endpoint.DumpStateViewClose]: 'POST',
} as const satisfies {[endpoint: string]: 'GET' | 'POST'}

/** Names of forms configured in devvit.json#forms, mapped to their submit endpoint. */
export type FormName = (typeof FormName)[keyof typeof FormName]
export const FormName = {
  ResetDedupeConfirm: 'reset-dedupe-confirm',
  DumpStateView: 'dump-state-view',
} as const
