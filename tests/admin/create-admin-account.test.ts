// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { createAdminAccount } from '../../server/admin/use-cases/create-admin-account'
import type { AdminRepository } from '../../server/admin/repository/admin-repository'

function fakeAdminRepository(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    createAdminAccount: vi.fn().mockResolvedValue({
      id: 'new-admin-1',
      email: 'new@example.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    }),
    createAuditLog: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as AdminRepository
}

describe('createAdminAccount', () => {
  it('hashes the password before persisting (never plaintext)', async () => {
    const adminRepository = fakeAdminRepository()

    await createAdminAccount(
      { email: 'new@example.com', password: 'password123', role: 'ADMIN' },
      'actor-1',
      { adminRepository },
    )

    const call = (adminRepository.createAdminAccount as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.passwordHash).not.toBe('password123')
    expect(call.passwordHash.length).toBeGreaterThan(20)
  })

  it('records an ADMIN_ACCOUNT_CREATE audit log entry attributed to the actor', async () => {
    const adminRepository = fakeAdminRepository()

    const account = await createAdminAccount(
      { email: 'new@example.com', password: 'password123', role: 'SUPER_ADMIN' },
      'actor-1',
      { adminRepository },
    )

    expect(adminRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        adminAccountId: 'actor-1',
        action: 'ADMIN_ACCOUNT_CREATE',
        targetType: 'AdminAccount',
        targetId: account.id,
      }),
    )
  })

  it('never returns the passwordHash from the created account object it hands back', async () => {
    const adminRepository = fakeAdminRepository()

    const account = await createAdminAccount(
      { email: 'new@example.com', password: 'password123', role: 'ADMIN' },
      'actor-1',
      { adminRepository },
    )

    expect('passwordHash' in account).toBe(false)
  })
})
