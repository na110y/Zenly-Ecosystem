// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import { handleForgotPassword } from '../../server/identity/handlers/forgot-password-handler'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'

const findByEmailMock = vi.fn()
const createTokenMock = vi.fn().mockResolvedValue({})

vi.mock('../../server/identity/db', () => ({ getPrismaClient: vi.fn(() => ({})) }))
vi.mock('../../server/identity/repository/user-repository', () => ({
  UserRepository: class {
    findByEmail = findByEmailMock
    createPasswordResetToken = createTokenMock
  },
}))

describe('POST /api/user/password/forgot handler (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp({ onError: (error, event) => errorHandler(error, event) })
    app.use(requestContextMiddleware)

    const router = createRouter()
    router.post(
      '/api/user/password/forgot',
      defineEventHandler((event) =>
        handleForgotPassword(event, {
          databaseUrl: 'postgresql://fake/fake',
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

  it('returns 200 when the email exists', async () => {
    findByEmailMock.mockResolvedValueOnce({ id: 'user-1', email: 'a@example.com' })
    const response = await fetch(`${baseUrl}/api/user/password/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com' }),
    })
    expect(response.status).toBe(200)
  })

  it('returns the identical 200 response when the email does not exist (no enumeration)', async () => {
    findByEmailMock.mockResolvedValueOnce(null)
    const response = await fetch(`${baseUrl}/api/user/password/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com' }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('returns 400 for an invalid payload', async () => {
    const response = await fetch(`${baseUrl}/api/user/password/forgot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    })
    expect(response.status).toBe(400)
  })
})
