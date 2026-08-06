// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, createRouter, toNodeListener, createError, defineEventHandler } from 'h3'
import requestContextMiddleware from '../../server/middleware/00.request-context'
import errorHandler from '../../server/error'

describe('request context + error envelope (real h3/HTTP)', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    const app = createApp({
      onError: (error, event) => errorHandler(error, event),
    })
    app.use(requestContextMiddleware)

    const router = createRouter()
    router.get(
      '/throws',
      defineEventHandler(() => {
        throw createError({ statusCode: 404, statusMessage: 'Not Found' })
      }),
    )
    router.get(
      '/throws-400',
      defineEventHandler(() => {
        throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
      }),
    )
    router.get(
      '/throws-401',
      defineEventHandler(() => {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
      }),
    )
    router.get(
      '/throws-403',
      defineEventHandler(() => {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
      }),
    )
    router.get(
      '/throws-409',
      defineEventHandler(() => {
        throw createError({ statusCode: 409, statusMessage: 'Conflict' })
      }),
    )
    router.get(
      '/throws-429',
      defineEventHandler(() => {
        throw createError({ statusCode: 429, statusMessage: 'Too Many Requests' })
      }),
    )
    router.get(
      '/throws-500-unhandled',
      defineEventHandler(() => {
        throw new Error('a raw internal error message that must never reach the client')
      }),
    )
    router.get(
      '/ok',
      defineEventHandler(() => ({ status: 'ok' })),
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

  it('returns the standard error envelope with correct code and a valid requestId for a thrown error', async () => {
    const response = await fetch(`${baseUrl}/throws`, { headers: { Accept: 'application/json' } })
    expect(response.status).toBe(404)

    const body = await response.json()
    expect(body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Not Found',
        requestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      },
    })
  })

  it('never leaks a stack trace or internal detail in the error response body', async () => {
    const response = await fetch(`${baseUrl}/throws`, { headers: { Accept: 'application/json' } })
    const text = await response.text()
    expect(text).not.toContain('at ')
    expect(text).not.toContain('.ts:')
    expect(text).not.toContain('node_modules')
    expect(Object.keys(JSON.parse(text))).toEqual(['error'])
    expect(Object.keys(JSON.parse(text).error).sort()).toEqual(['code', 'message', 'requestId'])
  })

  it('assigns a different requestId to two separate requests', async () => {
    const [first, second] = await Promise.all([
      fetch(`${baseUrl}/throws`, { headers: { Accept: 'application/json' } }),
      fetch(`${baseUrl}/throws`, { headers: { Accept: 'application/json' } }),
    ])
    const firstBody = await first.json()
    const secondBody = await second.json()
    expect(firstBody.error.requestId).not.toBe(secondBody.error.requestId)
  })

  it('successful requests are unaffected by the middleware', async () => {
    const response = await fetch(`${baseUrl}/ok`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('exposes the requestId via the X-Request-Id response header on success too', async () => {
    const response = await fetch(`${baseUrl}/ok`)
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
  })

  it.each([
    ['/throws-400', 400, 'VALIDATION_ERROR'],
    ['/throws-401', 401, 'UNAUTHORIZED'],
    ['/throws-403', 403, 'FORBIDDEN'],
    ['/throws-409', 409, 'CONFLICT'],
    ['/throws-429', 429, 'RATE_LIMITED'],
  ] as const)('maps HTTP %i on %s to error code %s', async (path, statusCode, code) => {
    const response = await fetch(`${baseUrl}${path}`, { headers: { Accept: 'application/json' } })
    expect(response.status).toBe(statusCode)
    const body = await response.json()
    expect(body.error.code).toBe(code)
  })

  it('maps an unhandled thrown Error to a safe 500 INTERNAL_ERROR without leaking the real message', async () => {
    const response = await fetch(`${baseUrl}/throws-500-unhandled`, {
      headers: { Accept: 'application/json' },
    })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error.code).toBe('INTERNAL_ERROR')
    expect(body.error.message).not.toContain('a raw internal error message')
  })
})
