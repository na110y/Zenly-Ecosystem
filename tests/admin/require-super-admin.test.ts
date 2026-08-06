// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { requireSuperAdmin } from '../../server/admin/require-super-admin'
import { setAdminContext } from '../../server/admin/context'
import type { H3Event } from 'h3'

function fakeEvent(): H3Event {
  return { context: {} } as unknown as H3Event
}

describe('requireSuperAdmin', () => {
  it('returns the admin context when role is SUPER_ADMIN and verified', () => {
    const event = fakeEvent()
    setAdminContext(event, {
      adminAccountId: 'admin-1',
      role: 'SUPER_ADMIN',
      totpVerifiedAt: new Date(),
    })

    expect(requireSuperAdmin(event)).toMatchObject({
      adminAccountId: 'admin-1',
      role: 'SUPER_ADMIN',
    })
  })

  it('throws a 403 when role is ADMIN even though verified', () => {
    const event = fakeEvent()
    setAdminContext(event, { adminAccountId: 'admin-1', role: 'ADMIN', totpVerifiedAt: new Date() })

    expect(() => requireSuperAdmin(event)).toThrow(expect.objectContaining({ statusCode: 403 }))
  })

  it('throws a 403 when verified as SUPER_ADMIN-eligible role but TOTP is not yet completed', () => {
    const event = fakeEvent()
    setAdminContext(event, { adminAccountId: 'admin-1', role: 'SUPER_ADMIN', totpVerifiedAt: null })

    expect(() => requireSuperAdmin(event)).toThrow(expect.objectContaining({ statusCode: 403 }))
  })

  it('throws a 401 when there is no admin context at all', () => {
    const event = fakeEvent()

    expect(() => requireSuperAdmin(event)).toThrow(expect.objectContaining({ statusCode: 401 }))
  })
})
