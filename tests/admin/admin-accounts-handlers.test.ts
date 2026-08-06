// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import { handleCreateAdminAccount } from '../../server/admin/handlers/create-admin-account-handler'
import { handleUpdateAdminAccount } from '../../server/admin/handlers/update-admin-account-handler'
import { handleListAdminAccounts } from '../../server/admin/handlers/list-admin-accounts-handler'
import { setAdminContext } from '../../server/admin/context'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'

const createAdminAccountMock = vi.fn()
const createAuditLogMock = vi.fn().mockResolvedValue({})
const findByIdMock = vi.fn()
const updateAdminAccountRoleMock = vi.fn()
const disableAdminAccountMock = vi.fn()
const enableAdminAccountMock = vi.fn()
const listAdminAccountsMock = vi.fn()

vi.mock('../../server/identity/db', () => ({
  getPrismaClient: vi.fn(() => ({})),
}))
vi.mock('../../server/admin/repository/admin-repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../server/admin/repository/admin-repository')>()
  return {
    ...actual,
    AdminRepository: class {
      createAdminAccount = createAdminAccountMock
      createAuditLog = createAuditLogMock
      findById = findByIdMock
      updateAdminAccountRole = updateAdminAccountRoleMock
      disableAdminAccount = disableAdminAccountMock
      enableAdminAccount = enableAdminAccountMock
      listAdminAccounts = listAdminAccountsMock
    },
  }
})

const config = { databaseUrl: 'postgresql://fake/fake' }

describe('admin-accounts handlers (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp({ onError: (error, event) => errorHandler(error, event) })
    app.use(requestContextMiddleware)
    app.use((event) => {
      const header = event.node.req.headers['x-test-role']
      if (typeof header === 'string') {
        setAdminContext(event, {
          adminAccountId: 'actor-1',
          role: header as 'ADMIN' | 'SUPER_ADMIN',
          totpVerifiedAt: new Date(),
        })
      }
    })

    const router = createRouter()
    router.get(
      '/api/system/admins',
      defineEventHandler((event) => handleListAdminAccounts(event, config)),
    )
    router.post(
      '/api/system/admins',
      defineEventHandler((event) => handleCreateAdminAccount(event, config)),
    )
    router.patch(
      '/api/system/admins/:id',
      defineEventHandler((event) => handleUpdateAdminAccount(event, config)),
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

  beforeEach(() => {
    createAdminAccountMock.mockReset()
    createAuditLogMock.mockReset().mockResolvedValue({})
    findByIdMock.mockReset()
    updateAdminAccountRoleMock.mockReset()
    disableAdminAccountMock.mockReset()
    enableAdminAccountMock.mockReset()
    listAdminAccountsMock.mockReset()
  })

  describe('GET /api/system/admins', () => {
    it('returns 401 with no admin context', async () => {
      const response = await fetch(`${baseUrl}/api/system/admins`, {
        headers: { Accept: 'application/json' },
      })
      expect(response.status).toBe(401)
    })

    it('returns 403 when the actor role is ADMIN', async () => {
      const response = await fetch(`${baseUrl}/api/system/admins`, {
        headers: { 'x-test-role': 'ADMIN', Accept: 'application/json' },
      })
      expect(response.status).toBe(403)
    })

    it('returns 200 with the account list and never leaks passwordHash', async () => {
      listAdminAccountsMock.mockResolvedValueOnce([
        {
          id: 'a1',
          email: 'a@example.com',
          passwordHash: 'super-secret-hash',
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: new Date(),
        },
      ])

      const response = await fetch(`${baseUrl}/api/system/admins`, {
        headers: { 'x-test-role': 'SUPER_ADMIN', Accept: 'application/json' },
      })
      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).not.toContain('super-secret-hash')
    })
  })

  describe('POST /api/system/admins', () => {
    it('returns 401 with no admin context', async () => {
      const response = await fetch(`${baseUrl}/api/system/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: 'x@example.com', password: 'password123', role: 'ADMIN' }),
      })
      expect(response.status).toBe(401)
    })

    it('returns 403 when the actor role is ADMIN (not SUPER_ADMIN)', async () => {
      const response = await fetch(`${baseUrl}/api/system/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email: 'x@example.com', password: 'password123', role: 'ADMIN' }),
      })
      expect(response.status).toBe(403)
    })

    it('returns 200 and never leaks passwordHash when the actor is SUPER_ADMIN', async () => {
      createAdminAccountMock.mockResolvedValueOnce({
        id: 'new-1',
        email: 'x@example.com',
        passwordHash: 'super-secret-hash',
        role: 'ADMIN',
        status: 'ACTIVE',
      })

      const response = await fetch(`${baseUrl}/api/system/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'SUPER_ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email: 'x@example.com', password: 'password123', role: 'ADMIN' }),
      })

      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).not.toContain('super-secret-hash')
      expect(createAuditLogMock).toHaveBeenCalled()
    })

    it('returns 400 for an invalid payload', async () => {
      const response = await fetch(`${baseUrl}/api/system/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'SUPER_ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email: 'not-an-email', password: 'short', role: 'ADMIN' }),
      })
      expect(response.status).toBe(400)
    })

    it('returns 409 when the email is already in use (Prisma P2002)', async () => {
      const conflict = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
      createAdminAccountMock.mockRejectedValueOnce(conflict)

      const response = await fetch(`${baseUrl}/api/system/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'SUPER_ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email: 'dup@example.com', password: 'password123', role: 'ADMIN' }),
      })
      expect(response.status).toBe(409)
    })

    it('rethrows an unexpected error as a 500 rather than swallowing it', async () => {
      createAdminAccountMock.mockRejectedValueOnce(new Error('unexpected db failure'))

      const response = await fetch(`${baseUrl}/api/system/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'SUPER_ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ email: 'x2@example.com', password: 'password123', role: 'ADMIN' }),
      })
      expect(response.status).toBe(500)
    })
  })

  describe('PATCH /api/system/admins/:id', () => {
    it('returns 403 when the actor role is ADMIN', async () => {
      const response = await fetch(`${baseUrl}/api/system/admins/target-1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ role: 'ADMIN' }),
      })
      expect(response.status).toBe(403)
    })

    it('returns 404 when the target admin account does not exist', async () => {
      findByIdMock.mockResolvedValueOnce(null)

      const response = await fetch(`${baseUrl}/api/system/admins/missing`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'SUPER_ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ role: 'ADMIN' }),
      })
      expect(response.status).toBe(404)
    })

    it('returns 409 when the repository rejects the last-active-SUPER_ADMIN demotion', async () => {
      findByIdMock.mockResolvedValueOnce({
        id: 'last-super',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      })
      const { LastActiveSuperAdminError } =
        await import('../../server/admin/repository/admin-repository')
      updateAdminAccountRoleMock.mockRejectedValueOnce(new LastActiveSuperAdminError())

      const response = await fetch(`${baseUrl}/api/system/admins/last-super`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'SUPER_ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ role: 'ADMIN' }),
      })
      expect(response.status).toBe(409)
    })

    it('returns 409 when the repository rejects disabling the last active SUPER_ADMIN', async () => {
      findByIdMock.mockResolvedValueOnce({
        id: 'last-super',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      })
      const { LastActiveSuperAdminError } =
        await import('../../server/admin/repository/admin-repository')
      disableAdminAccountMock.mockRejectedValueOnce(new LastActiveSuperAdminError())

      const response = await fetch(`${baseUrl}/api/system/admins/last-super`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'SUPER_ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ status: 'DISABLED' }),
      })
      expect(response.status).toBe(409)
    })

    it('returns 200 on a normal role change by a SUPER_ADMIN actor', async () => {
      findByIdMock.mockResolvedValueOnce({ id: 'target-1', role: 'ADMIN', status: 'ACTIVE' })

      const response = await fetch(`${baseUrl}/api/system/admins/target-1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'SUPER_ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ role: 'SUPER_ADMIN' }),
      })
      expect(response.status).toBe(200)
    })

    it('returns 200 on a normal disable by a SUPER_ADMIN actor', async () => {
      findByIdMock.mockResolvedValueOnce({ id: 'target-1', role: 'ADMIN', status: 'ACTIVE' })

      const response = await fetch(`${baseUrl}/api/system/admins/target-1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'SUPER_ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ status: 'DISABLED' }),
      })
      expect(response.status).toBe(200)
    })

    it('returns 200 when both role and status are changed in one request', async () => {
      findByIdMock.mockResolvedValueOnce({ id: 'target-1', role: 'ADMIN', status: 'ACTIVE' })

      const response = await fetch(`${baseUrl}/api/system/admins/target-1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'SUPER_ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ role: 'SUPER_ADMIN', status: 'DISABLED' }),
      })
      expect(response.status).toBe(200)
    })

    it('returns 400 for an invalid role/status payload', async () => {
      const response = await fetch(`${baseUrl}/api/system/admins/target-1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'SUPER_ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ role: 'NOT_A_ROLE' }),
      })
      expect(response.status).toBe(400)
    })

    it('returns 400 when neither role nor status is provided', async () => {
      const response = await fetch(`${baseUrl}/api/system/admins/target-1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'SUPER_ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({}),
      })
      expect(response.status).toBe(400)
    })

    it('rethrows an unexpected error as a 500 rather than swallowing it', async () => {
      findByIdMock.mockResolvedValueOnce({ id: 'target-1', role: 'ADMIN', status: 'ACTIVE' })
      updateAdminAccountRoleMock.mockRejectedValueOnce(new Error('unexpected db failure'))

      const response = await fetch(`${baseUrl}/api/system/admins/target-1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'SUPER_ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ role: 'SUPER_ADMIN' }),
      })
      expect(response.status).toBe(500)
    })
  })
})
