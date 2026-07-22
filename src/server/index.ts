#!/usr/bin/env -S node --experimental-strip-types --no-warnings=ExperimentalWarning
import {createServer, getServerPort} from '@devvit/web/server'
import {log} from './lib/log.ts'
import {onReq} from './server.ts'

const server = createServer(onReq)
const port: number = getServerPort()

server.on('error', err =>
  log({level: 'error', op: 'server.listen', status: 'error', error: err}),
)
server.listen(port, () =>
  log({
    op: 'server.listen',
    status: 'ok',
    context: {url: `http://localhost:${port}`},
  }),
)
