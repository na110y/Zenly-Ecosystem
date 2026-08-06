// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import { handleAdminTotpSetup } from '../../server/admin/handlers/totp-setup-handler'
import { setAdminContext } from '../../server/admin/context'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'

const findByIdMock = vi.fn()
const findTotpCredentialMock = vi.fn()
const upsertTotpCredentialMock = vi.fn().mockResolvedValue({})

vi.mock('../../server/identity/db', () => ({
  getPrismaClient: vi.fn(() => ({})),
}))
vi.mock('../../server/admin/repository/admin-repository', () => ({
  AdminRepository: class {
    findById = findByIdMock
    findTotpCredential = findTotpCredentialMock
    upsertTotpCredential = upsertTotpCredentialMock
  },
}))

const config = {
  databaseUrl: 'postgresql://fake/fake',
  totpEncryptionKey: 'test-encryption-key-32-bytes-min',
  issuer: 'Zenly Stories',
}

describe('POST /api/admin/totp/setup handler (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp({ onError: (error, event) => errorHandler(error, event) })
    app.use(requestContextMiddleware)
    // Simulate resolved admin session: totpVerifiedAt is intentionally NULL, matching
    // the login-step-1 state this route must still accept.
    app.use((event) => {
      const header = event.node.req.headers['x-test-admin-id']
      if (typeof header === 'string') {
        setAdminContext(event, { adminAccountId: header, role: 'ADMIN', totpVerifiedAt: null })
      }
    })

    const router = createRouter()
    router.post(
      '/api/admin/totp/setup',
      defineEventHandler((event) => handleAdminTotpSetup(event, config)),
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
    findByIdMock.mockReset()
    findTotpCredentialMock.mockReset()
    upsertTotpCredentialMock.mockReset().mockResolvedValue({})
  })

  it('returns 401 when no admin session context is present', async () => {
    const response = await fetch(`${baseUrl}/api/admin/totp/setup`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    })
    expect(response.status).toBe(401)
  })

  it('returns 200 with a QR code data URL, and no plaintext base32 secret, for an unactivated admin', async () => {
    findByIdMock.mockResolvedValueOnce({ id: 'admin-1', email: 'a@example.com' })
    findTotpCredentialMock.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/admin/totp/setup`, {
      method: 'POST',
      headers: { 'x-test-admin-id': 'admin-1', Accept: 'application/json' },
    })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/)
    expect(Object.keys(body)).toEqual(['qrCodeDataUrl'])
  })

  it('returns 409 when TOTP is already activated for this admin', async () => {
    findByIdMock.mockResolvedValueOnce({ id: 'admin-1', email: 'a@example.com' })
    findTotpCredentialMock.mockResolvedValueOnce({
      id: 'cred-1',
      adminAccountId: 'admin-1',
      secretEncrypted: 'a:b:c',
      activatedAt: new Date(),
    })

    const response = await fetch(`${baseUrl}/api/admin/totp/setup`, {
      method: 'POST',
      headers: { 'x-test-admin-id': 'admin-1', Accept: 'application/json' },
    })

    expect(response.status).toBe(409)
  })
})
