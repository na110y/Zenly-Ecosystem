// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import { handleVerifyEmail } from '../../server/identity/handlers/verify-email-handler'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'
import { hashToken } from '../../server/identity/token'

const findTokenMock = vi.fn()
const transactionMock = vi.fn()

vi.mock('../../server/identity/db', () => ({
  getPrismaClient: vi.fn(() => ({
    emailVerificationToken: {
      findUnique: findTokenMock,
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: transactionMock,
  })),
}))

describe('POST /api/user/register/verify-email handler (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp({ onError: (error, event) => errorHandler(error, event) })
    app.use(requestContextMiddleware)

    const router = createRouter()
    router.post(
      '/api/user/register/verify-email',
      defineEventHandler((event) =>
        handleVerifyEmail(event, { databaseUrl: 'postgresql://fake:fake@localhost/fake' }),
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

  it('returns 200 with status ok for a valid, unconsumed, unexpired token', async () => {
    findTokenMock.mockResolvedValueOnce({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: hashToken('good-token'),
      expiresAt: new Date(Date.now() + 3600_000),
      consumedAt: null,
    })
    transactionMock.mockResolvedValueOnce(undefined)

    const response = await fetch(`${baseUrl}/api/user/register/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'good-token' }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('returns 400 for a missing token field', async () => {
    const response = await fetch(`${baseUrl}/api/user/register/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({}),
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 NOT_FOUND-shaped VALIDATION_ERROR envelope when the token does not exist', async () => {
    findTokenMock.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/user/register/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token: 'unknown-token' }),
    })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 409 CONFLICT when the token has already been consumed (replay rejection)', async () => {
    findTokenMock.mockResolvedValueOnce({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: hashToken('used-token'),
      expiresAt: new Date(Date.now() + 3600_000),
      consumedAt: new Date(),
    })

    const response = await fetch(`${baseUrl}/api/user/register/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token: 'used-token' }),
    })
    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error.code).toBe('CONFLICT')
  })

  it('returns 409 CONFLICT when the token has expired', async () => {
    findTokenMock.mockResolvedValueOnce({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: hashToken('expired-token'),
      expiresAt: new Date(Date.now() - 1000),
      consumedAt: null,
    })

    const response = await fetch(`${baseUrl}/api/user/register/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token: 'expired-token' }),
    })
    expect(response.status).toBe(409)
  })
})
