// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import {
  handleGetNotificationPreferences,
  handleUpdateNotificationPreferences,
} from '../../server/identity/handlers/notification-preferences-handler'
import { setUserContext } from '../../server/identity/context'
import errorHandler from '../../server/error'
import requestContextMiddleware from '../../server/middleware/00.request-context'

const findPrefsMock = vi.fn()
const upsertPrefsMock = vi.fn()

vi.mock('../../server/identity/db', () => ({ getPrismaClient: vi.fn(() => ({})) }))
vi.mock('../../server/identity/repository/user-repository', () => ({
  UserRepository: class {
    findNotificationPreferences = findPrefsMock
    upsertNotificationPreferences = upsertPrefsMock
  },
}))

describe('GET/PATCH /api/user/notification-preferences handler (real h3/HTTP)', () => {
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
      '/api/user/notification-preferences',
      defineEventHandler((event) =>
        handleGetNotificationPreferences(event, { databaseUrl: 'postgresql://fake/fake' }),
      ),
    )
    router.patch(
      '/api/user/notification-preferences',
      defineEventHandler((event) =>
        handleUpdateNotificationPreferences(event, { databaseUrl: 'postgresql://fake/fake' }),
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
    const response = await fetch(`${baseUrl}/api/user/notification-preferences`, {
      headers: { Accept: 'application/json' },
    })
    expect(response.status).toBe(401)
  })

  it('GET returns default all-false preferences when none exist yet', async () => {
    findPrefsMock.mockResolvedValueOnce(null)
    const response = await fetch(`${baseUrl}/api/user/notification-preferences`, {
      headers: { 'X-Test-User-Id': 'user-1' },
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      newStoriesEmail: false,
      newChaptersEmail: false,
      webPushEnabled: false,
    })
  })

  it('PATCH returns 401 without a user context', async () => {
    const response = await fetch(`${baseUrl}/api/user/notification-preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        newStoriesEmail: true,
        newChaptersEmail: false,
        webPushEnabled: false,
      }),
    })
    expect(response.status).toBe(401)
  })

  it('PATCH updates preferences for an authenticated user', async () => {
    upsertPrefsMock.mockResolvedValueOnce({
      newStoriesEmail: true,
      newChaptersEmail: true,
      webPushEnabled: false,
    })

    const response = await fetch(`${baseUrl}/api/user/notification-preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Test-User-Id': 'user-1' },
      body: JSON.stringify({
        newStoriesEmail: true,
        newChaptersEmail: true,
        webPushEnabled: false,
      }),
    })
    expect(response.status).toBe(200)
    expect(upsertPrefsMock).toHaveBeenCalledWith('user-1', {
      newStoriesEmail: true,
      newChaptersEmail: true,
      webPushEnabled: false,
    })
  })

  it('PATCH returns 400 for a payload with a missing field', async () => {
    const response = await fetch(`${baseUrl}/api/user/notification-preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Test-User-Id': 'user-1',
      },
      body: JSON.stringify({ newStoriesEmail: true }),
    })
    expect(response.status).toBe(400)
  })
})
