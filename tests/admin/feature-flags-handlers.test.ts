// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import { handleListFeatureFlags } from '../../server/admin/handlers/list-feature-flags-handler'
import { handleUpdateFeatureFlag } from '../../server/admin/handlers/update-feature-flag-handler'
import { setAdminContext } from '../../server/admin/context'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'

const listFeatureFlagsMock = vi.fn()
const findFeatureFlagByKeyMock = vi.fn()
const updateFeatureFlagMock = vi.fn()
const createAuditLogMock = vi.fn().mockResolvedValue({})

vi.mock('../../server/identity/db', () => ({
  getPrismaClient: vi.fn(() => ({})),
}))
vi.mock('../../server/admin/repository/feature-flag-repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../server/admin/repository/feature-flag-repository')>()
  return {
    ...actual,
    FeatureFlagRepository: class {
      listFeatureFlags = listFeatureFlagsMock
      findFeatureFlagByKey = findFeatureFlagByKeyMock
      updateFeatureFlag = updateFeatureFlagMock
    },
  }
})
vi.mock('../../server/admin/repository/admin-repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../server/admin/repository/admin-repository')>()
  return {
    ...actual,
    AdminRepository: class {
      createAuditLog = createAuditLogMock
    },
  }
})

const config = { databaseUrl: 'postgresql://fake/fake' }

describe('feature-flags handlers (real h3/HTTP)', () => {
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
      '/api/system/feature-flags',
      defineEventHandler((event) => handleListFeatureFlags(event, config)),
    )
    router.patch(
      '/api/system/feature-flags/:key',
      defineEventHandler((event) => handleUpdateFeatureFlag(event, config)),
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
    listFeatureFlagsMock.mockReset()
    findFeatureFlagByKeyMock.mockReset()
    updateFeatureFlagMock.mockReset()
    createAuditLogMock.mockReset().mockResolvedValue({})
  })

  describe('GET /api/system/feature-flags', () => {
    it('returns 401 with no admin context', async () => {
      const response = await fetch(`${baseUrl}/api/system/feature-flags`, {
        headers: { Accept: 'application/json' },
      })
      expect(response.status).toBe(401)
    })

    it('returns 200 for ADMIN (read access is allowed for both roles)', async () => {
      listFeatureFlagsMock.mockResolvedValueOnce([
        { key: 'user_posting_enabled', enabled: false, scope: 'ADMIN_MANAGEABLE', version: 1 },
      ])

      const response = await fetch(`${baseUrl}/api/system/feature-flags`, {
        headers: { 'x-test-role': 'ADMIN', Accept: 'application/json' },
      })
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toHaveLength(1)
    })

    it('returns 200 for SUPER_ADMIN', async () => {
      listFeatureFlagsMock.mockResolvedValueOnce([])

      const response = await fetch(`${baseUrl}/api/system/feature-flags`, {
        headers: { 'x-test-role': 'SUPER_ADMIN', Accept: 'application/json' },
      })
      expect(response.status).toBe(200)
    })
  })

  describe('PATCH /api/system/feature-flags/:key', () => {
    it('returns 401 with no admin context', async () => {
      const response = await fetch(`${baseUrl}/api/system/feature-flags/user_posting_enabled`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ enabled: true, expectedVersion: 1 }),
      })
      expect(response.status).toBe(401)
    })

    it('returns 200 when ADMIN toggles an ADMIN_MANAGEABLE flag', async () => {
      findFeatureFlagByKeyMock.mockResolvedValueOnce({
        key: 'user_posting_enabled',
        enabled: false,
        scope: 'ADMIN_MANAGEABLE',
        version: 1,
      })
      updateFeatureFlagMock.mockResolvedValueOnce({
        key: 'user_posting_enabled',
        enabled: true,
        scope: 'ADMIN_MANAGEABLE',
        version: 2,
      })

      const response = await fetch(`${baseUrl}/api/system/feature-flags/user_posting_enabled`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ enabled: true, expectedVersion: 1 }),
      })
      expect(response.status).toBe(200)
    })

    it('returns 403 when ADMIN tries to toggle a SUPER_ADMIN_ONLY flag directly via the API', async () => {
      findFeatureFlagByKeyMock.mockResolvedValueOnce({
        key: 'community_feature_enabled',
        enabled: false,
        scope: 'SUPER_ADMIN_ONLY',
        version: 1,
      })

      const response = await fetch(
        `${baseUrl}/api/system/feature-flags/community_feature_enabled`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-test-role': 'ADMIN',
            Accept: 'application/json',
          },
          body: JSON.stringify({ enabled: true, expectedVersion: 1 }),
        },
      )
      expect(response.status).toBe(403)
      expect(updateFeatureFlagMock).not.toHaveBeenCalled()
    })

    it('returns 200 when SUPER_ADMIN toggles a SUPER_ADMIN_ONLY flag', async () => {
      findFeatureFlagByKeyMock.mockResolvedValueOnce({
        key: 'community_feature_enabled',
        enabled: false,
        scope: 'SUPER_ADMIN_ONLY',
        version: 1,
      })
      updateFeatureFlagMock.mockResolvedValueOnce({
        key: 'community_feature_enabled',
        enabled: true,
        scope: 'SUPER_ADMIN_ONLY',
        version: 2,
      })

      const response = await fetch(
        `${baseUrl}/api/system/feature-flags/community_feature_enabled`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-test-role': 'SUPER_ADMIN',
            Accept: 'application/json',
          },
          body: JSON.stringify({ enabled: true, expectedVersion: 1 }),
        },
      )
      expect(response.status).toBe(200)
    })

    it('returns 404 for an unknown flag key', async () => {
      findFeatureFlagByKeyMock.mockResolvedValueOnce(null)

      const response = await fetch(`${baseUrl}/api/system/feature-flags/unknown_flag`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'SUPER_ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ enabled: true, expectedVersion: 1 }),
      })
      expect(response.status).toBe(404)
    })

    it('returns 409 on a version conflict', async () => {
      findFeatureFlagByKeyMock.mockResolvedValueOnce({
        key: 'user_posting_enabled',
        enabled: false,
        scope: 'ADMIN_MANAGEABLE',
        version: 5,
      })
      const { FeatureFlagVersionConflictError } =
        await import('../../server/admin/repository/feature-flag-repository')
      updateFeatureFlagMock.mockRejectedValueOnce(new FeatureFlagVersionConflictError())

      const response = await fetch(`${baseUrl}/api/system/feature-flags/user_posting_enabled`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ enabled: true, expectedVersion: 1 }),
      })
      expect(response.status).toBe(409)
    })

    it('returns 400 for an invalid payload', async () => {
      const response = await fetch(`${baseUrl}/api/system/feature-flags/user_posting_enabled`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ enabled: 'not-a-boolean' }),
      })
      expect(response.status).toBe(400)
    })

    it('rethrows an unexpected error as a 500 rather than swallowing it', async () => {
      findFeatureFlagByKeyMock.mockResolvedValueOnce({
        key: 'user_posting_enabled',
        enabled: false,
        scope: 'ADMIN_MANAGEABLE',
        version: 1,
      })
      updateFeatureFlagMock.mockRejectedValueOnce(new Error('unexpected db failure'))

      const response = await fetch(`${baseUrl}/api/system/feature-flags/user_posting_enabled`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-test-role': 'ADMIN',
          Accept: 'application/json',
        },
        body: JSON.stringify({ enabled: true, expectedVersion: 1 }),
      })
      expect(response.status).toBe(500)
    })
  })
})
