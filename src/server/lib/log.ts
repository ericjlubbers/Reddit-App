type Level = 'debug' | 'info' | 'warn' | 'error'
type Status = 'start' | 'ok' | 'skip' | 'error'

interface LogArgs {
  level?: Level
  op: string
  status: Status
  durationMs?: number
  context?: Record<string, unknown>
  error?: unknown
}

export function log(args: LogArgs): void {
  const entry = {
    ts: new Date().toISOString(),
    level: args.level ?? 'info',
    phase: '3',
    op: args.op,
    status: args.status,
    ...(args.durationMs !== undefined ? {durationMs: args.durationMs} : {}),
    ...(args.context ? {context: args.context} : {}),
    ...(args.error ? {error: serializeError(args.error)} : {}),
  }
  // Devvit captures stdout; one JSON object per line.
  console.log(JSON.stringify(entry))
}

function serializeError(
  e: unknown,
):
  | {name: string; message: string; stack: string | undefined}
  | {value: string} {
  if (e instanceof Error)
    return {name: e.name, message: e.message, stack: e.stack}
  return {value: String(e)}
}

/** Wraps a fallible op in a start/ok/error log pair. */
export async function timed<T>(
  op: string,
  ctx: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  const t0 = Date.now()
  log({op, status: 'start', context: ctx})
  try {
    const result = await fn()
    log({op, status: 'ok', durationMs: Date.now() - t0, context: ctx})
    return result
  } catch (error) {
    log({
      level: 'error',
      op,
      status: 'error',
      durationMs: Date.now() - t0,
      context: ctx,
      error,
    })
    throw error
  }
}
