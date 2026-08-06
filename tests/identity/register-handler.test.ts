// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import { handleRegister } from '../../server/identity/handlers/register-handler'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'

vi.mock('../../server/identity/db', () => ({
  getPrismaClient: vi.fn(() => ({
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
        status: 'REGISTERED',
      }),
    },
    emailVerificationToken: {
      create: vi.fn().mockResolvedValue({}),
    },
  })),
}))

describe('POST /api/user/register handler (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp({ onError: (error, event) => errorHandler(error, event) })
    app.use(requestContextMiddleware)

    const router = createRouter()
    router.post(
      '/api/user/register',
      defineEventHandler((event) =>
        handleRegister(event, {
          databaseUrl: 'postgresql://fake:fake@localhost/fake',
          resendApiKey: '',
          emailFrom: 'noreply@example.com',
          public: { siteUrl: 'https://example.com' },
        }),
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

  it('returns 200 with status ok for a valid payload', async () => {
    const response = await fetch(`${baseUrl}/api/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'password123', displayName: 'A' }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('returns 400 VALIDATION_ERROR for an invalid payload', async () => {
    const response = await fetch(`${baseUrl}/api/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for a payload with an unknown extra field', async () => {
    const response = await fetch(`${baseUrl}/api/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: 'a@example.com',
        password: 'password123',
        displayName: 'A',
        role: 'ADMIN',
      }),
    })
    expect(response.status).toBe(400)
  })

  it('never leaks passwordHash or any password field in the response body', async () => {
    const response = await fetch(`${baseUrl}/api/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'password123', displayName: 'A' }),
    })
    const text = await response.text()
    expect(text).not.toContain('password123')
    expect(text).not.toContain('passwordHash')
  })
})
