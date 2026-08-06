// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import { handleLogout } from '../../server/identity/handlers/logout-handler'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'
import { hashToken } from '../../server/identity/token'

const findSessionMock = vi.fn()
const revokeSessionMock = vi.fn().mockResolvedValue(undefined)

vi.mock('../../server/identity/db', () => ({
  getPrismaClient: vi.fn(() => ({})),
}))
vi.mock('../../server/identity/repository/user-repository', () => ({
  UserRepository: class {
    findUserSessionByTokenHash = findSessionMock
    revokeUserSession = revokeSessionMock
  },
}))

describe('POST /api/user/logout handler (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp({ onError: (error, event) => errorHandler(error, event) })
    app.use(requestContextMiddleware)

    const router = createRouter()
    router.post(
      '/api/user/logout',
      defineEventHandler((event) => handleLogout(event, { databaseUrl: 'postgresql://fake/fake' })),
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

  it('revokes the session and clears the cookie when a valid session cookie is present', async () => {
    findSessionMock.mockResolvedValueOnce({
      id: 'session-1',
      tokenHash: hashToken('good-token'),
      revokedAt: null,
    })

    const response = await fetch(`${baseUrl}/api/user/logout`, {
      method: 'POST',
      headers: { Cookie: 'UserSession=good-token' },
    })

    expect(response.status).toBe(200)
    expect(revokeSessionMock).toHaveBeenCalledWith('session-1')
    const setCookie = response.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('UserSession=;')
  })

  it('returns 200 even with no session cookie present (idempotent)', async () => {
    const response = await fetch(`${baseUrl}/api/user/logout`, { method: 'POST' })
    expect(response.status).toBe(200)
  })
})
