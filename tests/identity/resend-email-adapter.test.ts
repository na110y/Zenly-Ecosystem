// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import {
  ResendEmailAdapter,
  EmailSendError,
} from '../../server/identity/adapters/resend-email-adapter'

const RESEND_SEND_URL = 'https://api.resend.com/emails'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('ResendEmailAdapter (contract test via MSW)', () => {
  const adapter = new ResendEmailAdapter('fake-api-key', 'noreply@example.com')

  it('resolves successfully on a 200 response', async () => {
    server.use(
      http.post(RESEND_SEND_URL, () => HttpResponse.json({ id: 'email-123' }, { status: 200 })),
    )

    await expect(
      adapter.send({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' }),
    ).resolves.toBeUndefined()
  })

  it('throws EmailSendError on a 429 rate-limit response', async () => {
    server.use(
      http.post(RESEND_SEND_URL, () =>
        HttpResponse.json(
          { name: 'rate_limit_exceeded', message: 'Too many requests', statusCode: 429 },
          { status: 429 },
        ),
      ),
    )

    await expect(
      adapter.send({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' }),
    ).rejects.toThrow(EmailSendError)
  })

  it('throws EmailSendError on a 5xx server error response', async () => {
    server.use(
      http.post(RESEND_SEND_URL, () =>
        HttpResponse.json(
          { name: 'internal_server_error', message: 'Server error', statusCode: 500 },
          { status: 500 },
        ),
      ),
    )

    await expect(
      adapter.send({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' }),
    ).rejects.toThrow(EmailSendError)
  })

  it('throws on a network-level timeout (connection error)', async () => {
    server.use(http.post(RESEND_SEND_URL, () => HttpResponse.error()))

    await expect(
      adapter.send({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' }),
    ).rejects.toThrow()
  })

  it('throws on a malformed (non-JSON) response body', async () => {
    server.use(http.post(RESEND_SEND_URL, () => new HttpResponse('not json {{{', { status: 200 })))

    await expect(
      adapter.send({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' }),
    ).rejects.toThrow()
  })

  it('throws EmailSendError (not a raw uncaught error) when the API key is empty', async () => {
    const misconfigured = new ResendEmailAdapter('', 'noreply@example.com')
    await expect(
      misconfigured.send({ to: 'user@example.com', subject: 'Hi', html: '<p>Hi</p>' }),
    ).rejects.toThrow(EmailSendError)
  })
})
