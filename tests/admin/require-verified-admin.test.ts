// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { requireVerifiedAdmin } from '../../server/admin/require-verified-admin'
import { setAdminContext } from '../../server/admin/context'
import type { H3Event } from 'h3'

function fakeEvent(): H3Event {
  return { context: {} } as unknown as H3Event
}

describe('requireVerifiedAdmin', () => {
  it('returns the admin context when totpVerifiedAt is set', () => {
    const event = fakeEvent()
    setAdminContext(event, { adminAccountId: 'admin-1', role: 'ADMIN', totpVerifiedAt: new Date() })

    expect(requireVerifiedAdmin(event)).toMatchObject({ adminAccountId: 'admin-1' })
  })

  it('throws a 401 when there is no admin context at all', () => {
    const event = fakeEvent()

    expect(() => requireVerifiedAdmin(event)).toThrow(expect.objectContaining({ statusCode: 401 }))
  })

  it('throws a 403 when the admin context exists but totpVerifiedAt is NULL', () => {
    const event = fakeEvent()
    setAdminContext(event, { adminAccountId: 'admin-1', role: 'ADMIN', totpVerifiedAt: null })

    expect(() => requireVerifiedAdmin(event)).toThrow(expect.objectContaining({ statusCode: 403 }))
  })
})
