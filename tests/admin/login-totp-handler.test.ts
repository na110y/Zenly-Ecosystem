// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import { Secret, TOTP } from 'otpauth'
import { handleAdminLoginTotp } from '../../server/admin/handlers/login-totp-handler'
import { encryptTotpSecret } from '../../server/admin/totp-encryption'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'

const findAdminSessionMock = vi.fn()
const findTotpCredentialMock = vi.fn()
const markAdminSessionTotpVerifiedMock = vi.fn().mockResolvedValue({})

vi.mock('../../server/identity/db', () => ({
  getPrismaClient: vi.fn(() => ({})),
}))
vi.mock('../../server/admin/repository/admin-repository', () => ({
  AdminRepository: class {
    findAdminSessionByTokenHash = findAdminSessionMock
    findTotpCredential = findTotpCredentialMock
    markAdminSessionTotpVerified = markAdminSessionTotpVerifiedMock
  },
}))

const totpEncryptionKey = 'test-encryption-key-32-bytes-min'
const config = { databaseUrl: 'postgresql://fake/fake', totpEncryptionKey }

function activatedCredential() {
  const secret = new Secret()
  const totp = new TOTP({ secret })
  const secretEncrypted = encryptTotpSecret(secret.base32, totpEncryptionKey)
  return { id: 'cred-1', adminAccountId: 'admin-1', secretEncrypted, activatedAt: new Date(), totp }
}

describe('POST /api/admin/login/totp handler (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp({ onError: (error, event) => errorHandler(error, event) })
    app.use(requestContextMiddleware)

    const router = createRouter()
    router.post(
      '/api/admin/login/totp',
      defineEventHandler((event) => handleAdminLoginTotp(event, config)),
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
    findAdminSessionMock.mockReset()
    findTotpCredentialMock.mockReset()
    markAdminSessionTotpVerifiedMock.mockReset().mockResolvedValue({})
  })

  it('returns 401 when no AdminSession cookie is present', async () => {
    const response = await fetch(`${baseUrl}/api/admin/login/totp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ code: '123456' }),
    })
    expect(response.status).toBe(401)
  })

  it('returns 200 and verifies the session for a correct code', async () => {
    const credential = activatedCredential()
    findAdminSessionMock.mockResolvedValueOnce({
      id: 'session-1',
      adminAccountId: 'admin-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      totpVerifiedAt: null,
    })
    findTotpCredentialMock.mockResolvedValueOnce(credential)

    const response = await fetch(`${baseUrl}/api/admin/login/totp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'AdminSession=good-token',
        Accept: 'application/json',
      },
      body: JSON.stringify({ code: credential.totp.generate() }),
    })

    expect(response.status).toBe(200)
    expect(markAdminSessionTotpVerifiedMock).toHaveBeenCalledWith('session-1')
  })

  it('returns 401 for an incorrect code and does not verify the session', async () => {
    const credential = activatedCredential()
    findAdminSessionMock.mockResolvedValueOnce({
      id: 'session-1',
      adminAccountId: 'admin-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      totpVerifiedAt: null,
    })
    findTotpCredentialMock.mockResolvedValueOnce(credential)

    const response = await fetch(`${baseUrl}/api/admin/login/totp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'AdminSession=good-token',
        Accept: 'application/json',
      },
      body: JSON.stringify({ code: '000000' }),
    })

    expect(response.status).toBe(401)
    expect(markAdminSessionTotpVerifiedMock).not.toHaveBeenCalled()
  })

  it('returns 409 when the session already completed TOTP', async () => {
    findAdminSessionMock.mockResolvedValueOnce({
      id: 'session-1',
      adminAccountId: 'admin-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      totpVerifiedAt: new Date(),
    })

    const response = await fetch(`${baseUrl}/api/admin/login/totp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'AdminSession=verified-token',
        Accept: 'application/json',
      },
      body: JSON.stringify({ code: '123456' }),
    })

    expect(response.status).toBe(409)
  })

  it('returns 400 for a malformed code payload', async () => {
    const response = await fetch(`${baseUrl}/api/admin/login/totp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'AdminSession=good-token',
        Accept: 'application/json',
      },
      body: JSON.stringify({ code: '12' }),
    })

    expect(response.status).toBe(400)
  })

  it('returns 401 when the cookie is present but matches no session (stale/forged token)', async () => {
    findAdminSessionMock.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/admin/login/totp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'AdminSession=unknown-token',
        Accept: 'application/json',
      },
      body: JSON.stringify({ code: '123456' }),
    })

    expect(response.status).toBe(401)
  })

  it('returns 409 when no TOTP credential has been activated for this admin yet', async () => {
    findAdminSessionMock.mockResolvedValueOnce({
      id: 'session-1',
      adminAccountId: 'admin-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 3600_000),
      totpVerifiedAt: null,
    })
    findTotpCredentialMock.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/admin/login/totp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'AdminSession=good-token',
        Accept: 'application/json',
      },
      body: JSON.stringify({ code: '123456' }),
    })

    expect(response.status).toBe(409)
  })
})
