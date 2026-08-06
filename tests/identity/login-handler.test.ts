// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import { handleLogin } from '../../server/identity/handlers/login-handler'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'
import { hashPassword } from '../../server/identity/password'

const findByEmailMock = vi.fn()
const createSessionMock = vi.fn().mockResolvedValue({})

vi.mock('../../server/identity/db', () => ({
  getPrismaClient: vi.fn(() => ({})),
}))
vi.mock('../../server/identity/repository/user-repository', () => ({
  UserRepository: class {
    findByEmail = findByEmailMock
    createUserSession = createSessionMock
  },
}))

describe('POST /api/user/login handler (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string
  let goodPasswordHash: string

  beforeAll(async () => {
    goodPasswordHash = await hashPassword('password123')

    const app = createApp({ onError: (error, event) => errorHandler(error, event) })
    app.use(requestContextMiddleware)

    const router = createRouter()
    router.post(
      '/api/user/login',
      defineEventHandler((event) => handleLogin(event, { databaseUrl: 'postgresql://fake/fake' })),
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

  it('returns 200 and sets an httpOnly UserSession cookie for valid credentials', async () => {
    findByEmailMock.mockResolvedValueOnce({
      id: 'user-1',
      email: 'a@example.com',
      passwordHash: goodPasswordHash,
      status: 'ACTIVE',
    })

    const response = await fetch(`${baseUrl}/api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'password123' }),
    })

    expect(response.status).toBe(200)
    const setCookie = response.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('UserSession=')
    expect(setCookie.toLowerCase()).toContain('httponly')
  })

  it('returns 401 for a wrong password without leaking whether the email exists', async () => {
    findByEmailMock.mockResolvedValueOnce({
      id: 'user-1',
      email: 'a@example.com',
      passwordHash: goodPasswordHash,
      status: 'ACTIVE',
    })

    const response = await fetch(`${baseUrl}/api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'wrong' }),
    })

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns the same 401 UNAUTHORIZED for a nonexistent email (no user enumeration)', async () => {
    findByEmailMock.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'password123' }),
    })

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 for a SUSPENDED account', async () => {
    findByEmailMock.mockResolvedValueOnce({
      id: 'user-1',
      email: 'suspended@example.com',
      passwordHash: goodPasswordHash,
      status: 'SUSPENDED',
    })

    const response = await fetch(`${baseUrl}/api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: 'suspended@example.com', password: 'password123' }),
    })

    expect(response.status).toBe(403)
  })

  it('never leaks passwordHash in the response body', async () => {
    findByEmailMock.mockResolvedValueOnce({
      id: 'user-1',
      email: 'a@example.com',
      passwordHash: goodPasswordHash,
      status: 'ACTIVE',
    })

    const response = await fetch(`${baseUrl}/api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@example.com', password: 'password123' }),
    })
    const text = await response.text()
    expect(text).not.toContain(goodPasswordHash)
  })

  it('returns 400 for an invalid payload', async () => {
    const response = await fetch(`${baseUrl}/api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    })
    expect(response.status).toBe(400)
  })
})
