// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import {
  handleGetProfile,
  handleUpdateProfile,
} from '../../server/identity/handlers/profile-handler'
import { setUserContext } from '../../server/identity/context'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'

const findUserByIdMock = vi.fn()
const updateProfileMock = vi.fn()

vi.mock('../../server/identity/db', () => ({ getPrismaClient: vi.fn(() => ({})) }))
vi.mock('../../server/identity/repository/user-repository', () => ({
  UserRepository: class {
    findUserById = findUserByIdMock
    updateProfile = updateProfileMock
  },
}))

describe('GET/PATCH /api/user/profile handler (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp({ onError: (error, event) => errorHandler(error, event) })
    app.use(requestContextMiddleware)
    app.use((event) => {
      if (event.node.req.headers['x-test-user-id']) {
        setUserContext(event, { userId: event.node.req.headers['x-test-user-id'] as string })
      }
    })

    const router = createRouter()
    router.get(
      '/api/user/profile',
      defineEventHandler((event) =>
        handleGetProfile(event, { databaseUrl: 'postgresql://fake/fake' }),
      ),
    )
    router.patch(
      '/api/user/profile',
      defineEventHandler((event) =>
        handleUpdateProfile(event, { databaseUrl: 'postgresql://fake/fake' }),
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

  it('GET returns 401 without a user context', async () => {
    const response = await fetch(`${baseUrl}/api/user/profile`, {
      headers: { Accept: 'application/json' },
    })
    expect(response.status).toBe(401)
  })

  it('GET returns the profile without passwordHash for an authenticated user', async () => {
    findUserByIdMock.mockResolvedValueOnce({
      id: 'user-1',
      email: 'a@example.com',
      displayName: 'A',
      status: 'ACTIVE',
      passwordHash: 'super-secret-hash',
    })

    const response = await fetch(`${baseUrl}/api/user/profile`, {
      headers: { 'X-Test-User-Id': 'user-1' },
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      id: 'user-1',
      email: 'a@example.com',
      displayName: 'A',
      status: 'ACTIVE',
    })

    const text = JSON.stringify(body)
    expect(text).not.toContain('super-secret-hash')
  })

  it('PATCH returns 401 without a user context', async () => {
    const response = await fetch(`${baseUrl}/api/user/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ displayName: 'New Name' }),
    })
    expect(response.status).toBe(401)
  })

  it('PATCH updates the displayName for an authenticated user', async () => {
    updateProfileMock.mockResolvedValueOnce({
      id: 'user-1',
      email: 'a@example.com',
      displayName: 'New Name',
      status: 'ACTIVE',
      passwordHash: 'hash',
    })

    const response = await fetch(`${baseUrl}/api/user/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Test-User-Id': 'user-1' },
      body: JSON.stringify({ displayName: 'New Name' }),
    })
    expect(response.status).toBe(200)
    expect(updateProfileMock).toHaveBeenCalledWith('user-1', { displayName: 'New Name' })
  })

  it('PATCH returns 400 for an invalid payload', async () => {
    const response = await fetch(`${baseUrl}/api/user/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Test-User-Id': 'user-1',
      },
      body: JSON.stringify({ displayName: '' }),
    })
    expect(response.status).toBe(400)
  })
})
