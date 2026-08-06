// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import { resolveAdminSessionMiddleware } from '../../server/admin/middleware/resolve-admin-session'
import { resolveUserSessionMiddleware } from '../../server/identity/middleware/resolve-user-session'
import { requireSuperAdmin } from '../../server/admin/require-super-admin'
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

describe('GET /api/system/whoami (real h3/HTTP)', () => {
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
      '/api/system/whoami',
      defineEventHandler((event) => {
        const context = requireSuperAdmin(event)
        return { adminAccountId: context.adminAccountId, role: context.role }
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

  it('returns 401 with no AdminSession cookie', async () => {
    const response = await fetch(`${baseUrl}/api/system/whoami`, {
      headers: { Accept: 'application/json' },
    })
    expect(response.status).toBe(401)
  })

  it('returns 403 when session exists but TOTP is not yet completed (login step 1 only)', async () => {
    findAdminSessionMock.mockResolvedValueOnce({
      adminAccountId: 'admin-1',
      tokenHash: hashToken('step1-token'),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      totpVerifiedAt: null,
    })
    findByIdMock.mockResolvedValueOnce({ id: 'admin-1', role: 'SUPER_ADMIN' })

    const response = await fetch(`${baseUrl}/api/system/whoami`, {
      headers: { Cookie: 'AdminSession=step1-token', Accept: 'application/json' },
    })
    expect(response.status).toBe(403)
  })

  it('returns 403 when fully logged in but role is ADMIN (not SUPER_ADMIN)', async () => {
    findAdminSessionMock.mockResolvedValueOnce({
      adminAccountId: 'admin-1',
      tokenHash: hashToken('admin-role-token'),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      totpVerifiedAt: new Date(),
    })
    findByIdMock.mockResolvedValueOnce({ id: 'admin-1', role: 'ADMIN' })

    const response = await fetch(`${baseUrl}/api/system/whoami`, {
      headers: { Cookie: 'AdminSession=admin-role-token', Accept: 'application/json' },
    })
    expect(response.status).toBe(403)
  })

  it('returns 200 when fully logged in as SUPER_ADMIN', async () => {
    findAdminSessionMock.mockResolvedValueOnce({
      adminAccountId: 'admin-1',
      tokenHash: hashToken('super-admin-token'),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      totpVerifiedAt: new Date(),
    })
    findByIdMock.mockResolvedValueOnce({ id: 'admin-1', role: 'SUPER_ADMIN' })

    const response = await fetch(`${baseUrl}/api/system/whoami`, {
      headers: { Cookie: 'AdminSession=super-admin-token', Accept: 'application/json' },
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ adminAccountId: 'admin-1', role: 'SUPER_ADMIN' })
  })

  it('a UserSession cookie is never accepted by the System route (401, never a role check)', async () => {
    findUserSessionMock.mockResolvedValueOnce({
      userId: 'user-1',
      tokenHash: hashToken('user-token'),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
    })

    const response = await fetch(`${baseUrl}/api/system/whoami`, {
      headers: { Cookie: 'UserSession=user-token', Accept: 'application/json' },
    })
    expect(response.status).toBe(401)
  })
})
