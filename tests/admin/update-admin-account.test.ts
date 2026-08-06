// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import {
  updateAdminAccount,
  AdminAccountNotFoundError,
} from '../../server/admin/use-cases/update-admin-account'
import { LastActiveSuperAdminError } from '../../server/admin/repository/admin-repository'
import type { AdminRepository } from '../../server/admin/repository/admin-repository'

function fakeAdminRepository(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    findById: vi.fn().mockResolvedValue({ id: 'target-1', role: 'ADMIN', status: 'ACTIVE' }),
    updateAdminAccountRole: vi.fn().mockResolvedValue(undefined),
    disableAdminAccount: vi.fn().mockResolvedValue(undefined),
    enableAdminAccount: vi.fn().mockResolvedValue({}),
    createAuditLog: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as AdminRepository
}

describe('updateAdminAccount', () => {
  it('updates only the role when status is not provided', async () => {
    const adminRepository = fakeAdminRepository()

    await updateAdminAccount('target-1', { role: 'SUPER_ADMIN' }, 'actor-1', { adminRepository })

    expect(adminRepository.updateAdminAccountRole).toHaveBeenCalledWith(
      'target-1',
      'ADMIN',
      'SUPER_ADMIN',
    )
    expect(adminRepository.disableAdminAccount).not.toHaveBeenCalled()
    expect(adminRepository.enableAdminAccount).not.toHaveBeenCalled()
    expect(adminRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ADMIN_ACCOUNT_UPDATE',
        beforeValue: { role: 'ADMIN' },
        afterValue: { role: 'SUPER_ADMIN' },
      }),
    )
  })

  it('disables the account when status DISABLED is requested', async () => {
    const adminRepository = fakeAdminRepository()

    await updateAdminAccount('target-1', { status: 'DISABLED' }, 'actor-1', { adminRepository })

    expect(adminRepository.disableAdminAccount).toHaveBeenCalledWith('target-1', 'ADMIN')
    expect(adminRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        beforeValue: { status: 'ACTIVE' },
        afterValue: { status: 'DISABLED' },
      }),
    )
  })

  it('re-enables a DISABLED account when status ACTIVE is requested', async () => {
    const adminRepository = fakeAdminRepository({
      findById: vi.fn().mockResolvedValue({ id: 'target-1', role: 'ADMIN', status: 'DISABLED' }),
    })

    await updateAdminAccount('target-1', { status: 'ACTIVE' }, 'actor-1', { adminRepository })

    expect(adminRepository.enableAdminAccount).toHaveBeenCalledWith('target-1')
  })

  it('applies both role and status changes and records both in the audit log', async () => {
    const adminRepository = fakeAdminRepository()

    await updateAdminAccount('target-1', { role: 'SUPER_ADMIN', status: 'DISABLED' }, 'actor-1', {
      adminRepository,
    })

    expect(adminRepository.updateAdminAccountRole).toHaveBeenCalledWith(
      'target-1',
      'ADMIN',
      'SUPER_ADMIN',
    )
    // Status change must be evaluated against the *new* role, not the stale pre-update role.
    expect(adminRepository.disableAdminAccount).toHaveBeenCalledWith('target-1', 'SUPER_ADMIN')
    expect(adminRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        beforeValue: { role: 'ADMIN', status: 'ACTIVE' },
        afterValue: { role: 'SUPER_ADMIN', status: 'DISABLED' },
      }),
    )
  })

  it('is a no-op (no repository writes, no audit log) when the requested values equal the current ones', async () => {
    const adminRepository = fakeAdminRepository({
      findById: vi.fn().mockResolvedValue({ id: 'target-1', role: 'ADMIN', status: 'ACTIVE' }),
    })

    await updateAdminAccount('target-1', { role: 'ADMIN', status: 'ACTIVE' }, 'actor-1', {
      adminRepository,
    })

    expect(adminRepository.updateAdminAccountRole).not.toHaveBeenCalled()
    expect(adminRepository.disableAdminAccount).not.toHaveBeenCalled()
    expect(adminRepository.enableAdminAccount).not.toHaveBeenCalled()
    expect(adminRepository.createAuditLog).not.toHaveBeenCalled()
  })

  it('throws AdminAccountNotFoundError when the target does not exist', async () => {
    const adminRepository = fakeAdminRepository({ findById: vi.fn().mockResolvedValue(null) })

    await expect(
      updateAdminAccount('missing', { role: 'ADMIN' }, 'actor-1', { adminRepository }),
    ).rejects.toThrow(AdminAccountNotFoundError)
    expect(adminRepository.createAuditLog).not.toHaveBeenCalled()
  })

  it('propagates LastActiveSuperAdminError from a role demotion without writing an audit log', async () => {
    const adminRepository = fakeAdminRepository({
      findById: vi
        .fn()
        .mockResolvedValue({ id: 'last-super', role: 'SUPER_ADMIN', status: 'ACTIVE' }),
      updateAdminAccountRole: vi.fn().mockRejectedValue(new LastActiveSuperAdminError()),
    })

    await expect(
      updateAdminAccount('last-super', { role: 'ADMIN' }, 'actor-1', { adminRepository }),
    ).rejects.toThrow(LastActiveSuperAdminError)
    expect(adminRepository.createAuditLog).not.toHaveBeenCalled()
  })

  it('propagates LastActiveSuperAdminError from a disable without writing an audit log', async () => {
    const adminRepository = fakeAdminRepository({
      findById: vi
        .fn()
        .mockResolvedValue({ id: 'last-super', role: 'SUPER_ADMIN', status: 'ACTIVE' }),
      disableAdminAccount: vi.fn().mockRejectedValue(new LastActiveSuperAdminError()),
    })

    await expect(
      updateAdminAccount('last-super', { status: 'DISABLED' }, 'actor-1', { adminRepository }),
    ).rejects.toThrow(LastActiveSuperAdminError)
    expect(adminRepository.createAuditLog).not.toHaveBeenCalled()
  })
})
