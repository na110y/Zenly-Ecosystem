// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import { Secret, TOTP } from 'otpauth'
import { handleAdminTotpActivate } from '../../server/admin/handlers/totp-activate-handler'
import { encryptTotpSecret } from '../../server/admin/totp-encryption'
import { setAdminContext } from '../../server/admin/context'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'

const findTotpCredentialMock = vi.fn()
const activateTotpCredentialMock = vi.fn().mockResolvedValue({})

vi.mock('../../server/identity/db', () => ({
  getPrismaClient: vi.fn(() => ({})),
}))
vi.mock('../../server/admin/repository/admin-repository', () => ({
  AdminRepository: class {
    findTotpCredential = findTotpCredentialMock
    activateTotpCredential = activateTotpCredentialMock
  },
}))

const totpEncryptionKey = 'test-encryption-key-32-bytes-min'
const config = { databaseUrl: 'postgresql://fake/fake', totpEncryptionKey }

function seededCredential() {
  const secret = new Secret()
  const totp = new TOTP({ secret })
  const secretEncrypted = encryptTotpSecret(secret.base32, totpEncryptionKey)
  return { id: 'cred-1', adminAccountId: 'admin-1', secretEncrypted, activatedAt: null, totp }
}

describe('POST /api/admin/totp/activate handler (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp({ onError: (error, event) => errorHandler(error, event) })
    app.use(requestContextMiddleware)
    app.use((event) => {
      const header = event.node.req.headers['x-test-admin-id']
      if (typeof header === 'string') {
        setAdminContext(event, { adminAccountId: header, role: 'ADMIN', totpVerifiedAt: null })
      }
    })

    const router = createRouter()
    router.post(
      '/api/admin/totp/activate',
      defineEventHandler((event) => handleAdminTotpActivate(event, config)),
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
    findTotpCredentialMock.mockReset()
    activateTotpCredentialMock.mockReset().mockResolvedValue({})
  })

  it('returns 401 when no admin session context is present', async () => {
    const response = await fetch(`${baseUrl}/api/admin/totp/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ code: '123456' }),
    })
    expect(response.status).toBe(401)
  })

  it('returns 200 and activates for a correct code', async () => {
    const credential = seededCredential()
    findTotpCredentialMock.mockResolvedValueOnce(credential)

    const response = await fetch(`${baseUrl}/api/admin/totp/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-admin-id': 'admin-1',
        Accept: 'application/json',
      },
      body: JSON.stringify({ code: credential.totp.generate() }),
    })

    expect(response.status).toBe(200)
    expect(activateTotpCredentialMock).toHaveBeenCalledWith('cred-1')
  })

  it('returns 401 for an incorrect code and does not activate', async () => {
    const credential = seededCredential()
    findTotpCredentialMock.mockResolvedValueOnce(credential)

    const response = await fetch(`${baseUrl}/api/admin/totp/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-admin-id': 'admin-1',
        Accept: 'application/json',
      },
      body: JSON.stringify({ code: '000000' }),
    })

    expect(response.status).toBe(401)
    expect(activateTotpCredentialMock).not.toHaveBeenCalled()
  })

  it('returns 409 when no credential has been set up yet', async () => {
    findTotpCredentialMock.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/admin/totp/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-admin-id': 'admin-1',
        Accept: 'application/json',
      },
      body: JSON.stringify({ code: '123456' }),
    })

    expect(response.status).toBe(409)
  })

  it('returns 400 for a malformed code payload', async () => {
    const response = await fetch(`${baseUrl}/api/admin/totp/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-admin-id': 'admin-1',
        Accept: 'application/json',
      },
      body: JSON.stringify({ code: '12' }),
    })

    expect(response.status).toBe(400)
  })
})
