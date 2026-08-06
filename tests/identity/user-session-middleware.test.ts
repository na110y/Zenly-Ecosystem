// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler, createError } from 'h3'
import { resolveUserSessionMiddleware } from '../../server/identity/middleware/resolve-user-session'
import { getUserContext } from '../../server/identity/context'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'
import { hashToken } from '../../server/identity/token'

const findSessionMock = vi.fn()

vi.mock('../../server/identity/db', () => ({
  getPrismaClient: vi.fn(() => ({})),
}))
vi.mock('../../server/identity/repository/user-repository', () => ({
  UserRepository: class {
    findUserSessionByTokenHash = findSessionMock
  },
}))

describe('user session middleware + protected route (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp({ onError: (error, event) => errorHandler(error, event) })
    app.use(requestContextMiddleware)
    app.use((event) =>
      resolveUserSessionMiddleware(event, { databaseUrl: 'postgresql://fake/fake' }),
    )

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

  it('returns 401 when no session cookie is present', async () => {
    const response = await fetch(`${baseUrl}/api/user/me`, {
      headers: { Accept: 'application/json' },
    })
    expect(response.status).toBe(401)
  })

  it('returns 200 with the userId for a valid session cookie', async () => {
    findSessionMock.mockResolvedValueOnce({
      userId: 'user-42',
      tokenHash: hashToken('valid-token'),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
    })

    const response = await fetch(`${baseUrl}/api/user/me`, {
      headers: { Cookie: 'UserSession=valid-token' },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ userId: 'user-42' })
  })

  it('returns 401 for a revoked session cookie', async () => {
    findSessionMock.mockResolvedValueOnce({
      userId: 'user-42',
      tokenHash: hashToken('revoked-token'),
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600_000),
    })

    const response = await fetch(`${baseUrl}/api/user/me`, {
      headers: { Cookie: 'UserSession=revoked-token', Accept: 'application/json' },
    })
    expect(response.status).toBe(401)
  })

  it('returns 401 for an expired session cookie', async () => {
    findSessionMock.mockResolvedValueOnce({
      userId: 'user-42',
      tokenHash: hashToken('expired-token'),
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    })

    const response = await fetch(`${baseUrl}/api/user/me`, {
      headers: { Cookie: 'UserSession=expired-token', Accept: 'application/json' },
    })
    expect(response.status).toBe(401)
  })
})
