// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler, createError } from 'h3'
import { resolveAdminSessionMiddleware } from '../../server/admin/middleware/resolve-admin-session'
import { resolveUserSessionMiddleware } from '../../server/identity/middleware/resolve-user-session'
import { getAdminContext } from '../../server/admin/context'
import { getUserContext } from '../../server/identity/context'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'
import { hashToken } from '../../server/identity/token'

const findAdminSessionMock = vi.fn()
const findByIdMock = vi.fn()
const findUserSessionMock = vi.fn()

vi.mock('../../server/identity/db', () => ({
  getPrismaClient: vi.fn(() => ({})),
}))
vi.mock('../../server/admin/repository/admin-repository', () => ({
  AdminRepository: class {
    findAdminSessionByTokenHash = findAdminSessionMock
    findById = findByIdMock
  },
}))
vi.mock('../../server/identity/repository/user-repository', () => ({
  UserRepository: class {
    findUserSessionByTokenHash = findUserSessionMock
  },
}))

describe('admin session middleware + protected route (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp({ onError: (error, event) => errorHandler(error, event) })
    app.use(requestContextMiddleware)
    app.use((event) =>
      resolveUserSessionMiddleware(event, { databaseUrl: 'postgresql://fake/fake' }),
    )
    app.use((event) =>
      resolveAdminSessionMiddleware(event, { databaseUrl: 'postgresql://fake/fake' }),
    )

    const router = createRouter()
    router.get(
      '/api/admin/whoami',
      defineEventHandler((event) => {
        const context = getAdminContext(event)
        if (!context) {
          throw createError({ statusCode: 401, statusMessage: 'Admin session required' })
        }
        return { adminAccountId: context.adminAccountId }
      }),
    )
    router.get(
      '/api/user/whoami',
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

  it('returns 401 when no AdminSession cookie is present', async () => {
    const response = await fetch(`${baseUrl}/api/admin/whoami`, {
      headers: { Accept: 'application/json' },
    })
    expect(response.status).toBe(401)
  })

  it('returns 200 with the adminAccountId for a valid AdminSession cookie', async () => {
    findAdminSessionMock.mockResolvedValueOnce({
      adminAccountId: 'admin-42',
      tokenHash: hashToken('valid-admin-token'),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      totpVerifiedAt: null,
    })
    findByIdMock.mockResolvedValueOnce({ id: 'admin-42', role: 'ADMIN' })

    const response = await fetch(`${baseUrl}/api/admin/whoami`, {
      headers: { Cookie: 'AdminSession=valid-admin-token' },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ adminAccountId: 'admin-42' })
  })

  it('returns 401 for a revoked AdminSession cookie', async () => {
    findAdminSessionMock.mockResolvedValueOnce({
      adminAccountId: 'admin-42',
      tokenHash: hashToken('revoked-admin-token'),
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600_000),
      totpVerifiedAt: null,
    })

    const response = await fetch(`${baseUrl}/api/admin/whoami`, {
      headers: { Cookie: 'AdminSession=revoked-admin-token', Accept: 'application/json' },
    })
    expect(response.status).toBe(401)
  })

  it('a UserSession cookie is never accepted by the admin route', async () => {
    findUserSessionMock.mockResolvedValueOnce({
      userId: 'user-1',
      tokenHash: hashToken('user-token'),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
    })

    const response = await fetch(`${baseUrl}/api/admin/whoami`, {
      headers: { Cookie: 'UserSession=user-token', Accept: 'application/json' },
    })
    expect(response.status).toBe(401)
    expect(findAdminSessionMock).not.toHaveBeenCalledWith(hashToken('user-token'))
  })

  it('an AdminSession cookie is never accepted by the user route', async () => {
    findAdminSessionMock.mockResolvedValueOnce({
      adminAccountId: 'admin-42',
      tokenHash: hashToken('admin-token'),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      totpVerifiedAt: null,
    })
    findByIdMock.mockResolvedValueOnce({ id: 'admin-42', role: 'ADMIN' })

    const response = await fetch(`${baseUrl}/api/user/whoami`, {
      headers: { Cookie: 'AdminSession=admin-token', Accept: 'application/json' },
    })
    expect(response.status).toBe(401)
  })
})
