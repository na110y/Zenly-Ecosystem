// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { resolveAdminSession } from '../../server/admin/use-cases/resolve-admin-session'
import type { AdminRepository } from '../../server/admin/repository/admin-repository'
import { hashToken } from '../../server/identity/token'

function fakeAdminRepository(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    findAdminSessionByTokenHash: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as AdminRepository
}

describe('resolveAdminSession', () => {
  it('returns null when no token is provided', async () => {
    const adminRepository = fakeAdminRepository()
    expect(await resolveAdminSession(undefined, { adminRepository })).toBeNull()
  })

  it('returns null when the token does not match any session', async () => {
    const adminRepository = fakeAdminRepository({
      findAdminSessionByTokenHash: vi.fn().mockResolvedValue(null),
    })
    expect(await resolveAdminSession('unknown', { adminRepository })).toBeNull()
  })

  it('returns null for a revoked session', async () => {
    const adminRepository = fakeAdminRepository({
      findAdminSessionByTokenHash: vi.fn().mockResolvedValue({
        adminAccountId: 'admin-1',
        tokenHash: hashToken('revoked-token'),
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600_000),
        totpVerifiedAt: null,
      }),
    })
    expect(await resolveAdminSession('revoked-token', { adminRepository })).toBeNull()
  })

  it('returns null for an expired session', async () => {
    const adminRepository = fakeAdminRepository({
      findAdminSessionByTokenHash: vi.fn().mockResolvedValue({
        adminAccountId: 'admin-1',
        tokenHash: hashToken('expired-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        totpVerifiedAt: null,
      }),
    })
    expect(await resolveAdminSession('expired-token', { adminRepository })).toBeNull()
  })

  it('returns the admin context, including a NULL totpVerifiedAt, for a valid unexpired unrevoked session', async () => {
    const adminRepository = fakeAdminRepository({
      findAdminSessionByTokenHash: vi.fn().mockResolvedValue({
        adminAccountId: 'admin-1',
        tokenHash: hashToken('good-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3600_000),
        totpVerifiedAt: null,
      }),
      findById: vi.fn().mockResolvedValue({ id: 'admin-1', role: 'ADMIN' }),
    })
    expect(await resolveAdminSession('good-token', { adminRepository })).toEqual({
      adminAccountId: 'admin-1',
      role: 'ADMIN',
      totpVerifiedAt: null,
    })
  })

  it('returns null when the admin account no longer exists', async () => {
    const adminRepository = fakeAdminRepository({
      findAdminSessionByTokenHash: vi.fn().mockResolvedValue({
        adminAccountId: 'deleted-admin',
        tokenHash: hashToken('good-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3600_000),
        totpVerifiedAt: null,
      }),
      findById: vi.fn().mockResolvedValue(null),
    })
    expect(await resolveAdminSession('good-token', { adminRepository })).toBeNull()
  })
})
