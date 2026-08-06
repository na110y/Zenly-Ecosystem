// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler, createError } from 'h3'
import { setUserContext, getUserContext } from '../../server/identity/context'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'

describe('GET /api/user/me (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp({ onError: (error, event) => errorHandler(error, event) })
    app.use(requestContextMiddleware)
    app.use((event) => {
      if (event.node.req.headers['x-test-user-id']) {
        setUserContext(event, { userId: event.node.req.headers['x-test-user-id'] as string })
      }
    })

    const router = createRouter()
    router.get(
      '/api/user/me',
      defineEventHandler((event) => {
        const context = getUserContext(event)
        if (!context) {
          throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
        }
        return { userId: context.userId }
      }),
    )
    app.use(router)

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

  it('returns 401 when there is no user context', async () => {
    const response = await fetch(`${baseUrl}/api/user/me`, {
      headers: { Accept: 'application/json' },
    })
    expect(response.status).toBe(401)
  })

  it('returns 200 with the userId when a user context is present', async () => {
    const response = await fetch(`${baseUrl}/api/user/me`, {
      headers: { 'X-Test-User-Id': 'user-99' },
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ userId: 'user-99' })
  })
})
