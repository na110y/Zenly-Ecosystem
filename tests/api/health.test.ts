// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, toNodeListener } from 'h3'
import healthHandler from '../../server/api/public/health.get'

describe('GET /api/public/health (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp()
    app.use('/api/public/health', healthHandler)
    server = createServer(toNodeListener(app))
    await new Promise<void>((resolve) => server.listen(0, resolve))
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    )
  })

  it('returns 200 with a status ok body', async () => {
    const response = await fetch(`${baseUrl}/api/public/health`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })
})
