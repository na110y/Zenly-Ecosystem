// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import { handleResetPassword } from '../../server/identity/handlers/reset-password-handler'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'
import { hashToken } from '../../server/identity/token'

const findTokenMock = vi.fn()
const resetAndRevokeMock = vi.fn().mockResolvedValue(undefined)

vi.mock('../../server/identity/db', () => ({ getPrismaClient: vi.fn(() => ({})) }))
vi.mock('../../server/identity/repository/user-repository', () => ({
  UserRepository: class {
    findPasswordResetTokenByHash = findTokenMock
    resetPasswordAndRevokeSessions = resetAndRevokeMock
  },
}))

describe('POST /api/user/password/reset handler (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp({ onError: (error, event) => errorHandler(error, event) })
    app.use(requestContextMiddleware)

    const router = createRouter()
    router.post(
      '/api/user/password/reset',
      defineEventHandler((event) =>
        handleResetPassword(event, { databaseUrl: 'postgresql://fake/fake' }),
      ),
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

  it('returns 200 for a valid, unconsumed, unexpired token', async () => {
    findTokenMock.mockResolvedValueOnce({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: hashToken('good-token'),
      expiresAt: new Date(Date.now() + 3600_000),
      consumedAt: null,
    })

    const response = await fetch(`${baseUrl}/api/user/password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'good-token', newPassword: 'newpassword123' }),
    })
    expect(response.status).toBe(200)
  })

  it('returns 400 for an unknown token', async () => {
    findTokenMock.mockResolvedValueOnce(null)
    const response = await fetch(`${baseUrl}/api/user/password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token: 'unknown', newPassword: 'newpassword123' }),
    })
    expect(response.status).toBe(400)
  })

  it('returns 409 for an already-consumed token (replay rejection)', async () => {
    findTokenMock.mockResolvedValueOnce({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: hashToken('used-token'),
      expiresAt: new Date(Date.now() + 3600_000),
      consumedAt: new Date(),
    })

    const response = await fetch(`${baseUrl}/api/user/password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token: 'used-token', newPassword: 'newpassword123' }),
    })
    expect(response.status).toBe(409)
  })

  it('returns 409 for an expired token', async () => {
    findTokenMock.mockResolvedValueOnce({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: hashToken('expired-token'),
      expiresAt: new Date(Date.now() - 1000),
      consumedAt: null,
    })

    const response = await fetch(`${baseUrl}/api/user/password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token: 'expired-token', newPassword: 'newpassword123' }),
    })
    expect(response.status).toBe(409)
  })

  it('returns 400 for a payload with a too-short new password', async () => {
    const response = await fetch(`${baseUrl}/api/user/password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token: 'x', newPassword: 'short' }),
    })
    expect(response.status).toBe(400)
  })
})
