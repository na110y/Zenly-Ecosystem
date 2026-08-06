// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import {
  updateFeatureFlag,
  FeatureFlagNotFoundError,
  InsufficientRoleForFlagError,
} from '../../server/admin/use-cases/update-feature-flag'
import {
  FeatureFlagVersionConflictError,
  type FeatureFlagRepository,
} from '../../server/admin/repository/feature-flag-repository'
import type { AdminRepository } from '../../server/admin/repository/admin-repository'
import type { AdminContext } from '../../server/admin/context'

function fakeFeatureFlagRepository(
  overrides: Partial<FeatureFlagRepository> = {},
): FeatureFlagRepository {
  return {
    findFeatureFlagByKey: vi.fn().mockResolvedValue({
      key: 'user_posting_enabled',
      enabled: false,
      scope: 'ADMIN_MANAGEABLE',
      version: 1,
    }),
    updateFeatureFlag: vi.fn().mockResolvedValue({
      key: 'user_posting_enabled',
      enabled: true,
      scope: 'ADMIN_MANAGEABLE',
      version: 2,
    }),
    ...overrides,
  } as unknown as FeatureFlagRepository
}

function fakeAdminRepository(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    createAuditLog: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as AdminRepository
}

const adminActor: AdminContext = {
  adminAccountId: 'admin-1',
  role: 'ADMIN',
  totpVerifiedAt: new Date(),
}
const superAdminActor: AdminContext = {
  adminAccountId: 'super-1',
  role: 'SUPER_ADMIN',
  totpVerifiedAt: new Date(),
}

describe('updateFeatureFlag', () => {
  it('allows ADMIN to toggle an ADMIN_MANAGEABLE flag', async () => {
    const featureFlagRepository = fakeFeatureFlagRepository()
    const adminRepository = fakeAdminRepository()

    const result = await updateFeatureFlag(
      { key: 'user_posting_enabled', enabled: true, expectedVersion: 1 },
      adminActor,
      { featureFlagRepository, adminRepository },
    )

    expect(result.enabled).toBe(true)
    expect(featureFlagRepository.updateFeatureFlag).toHaveBeenCalledWith(
      'user_posting_enabled',
      true,
      1,
      'admin-1',
    )
  })

  it('allows SUPER_ADMIN to toggle an ADMIN_MANAGEABLE flag', async () => {
    const featureFlagRepository = fakeFeatureFlagRepository()
    const adminRepository = fakeAdminRepository()

    await expect(
      updateFeatureFlag(
        { key: 'user_posting_enabled', enabled: true, expectedVersion: 1 },
        superAdminActor,
        { featureFlagRepository, adminRepository },
      ),
    ).resolves.toBeDefined()
  })

  it('rejects ADMIN toggling a SUPER_ADMIN_ONLY flag with InsufficientRoleForFlagError', async () => {
    const featureFlagRepository = fakeFeatureFlagRepository({
      findFeatureFlagByKey: vi.fn().mockResolvedValue({
        key: 'community_feature_enabled',
        enabled: false,
        scope: 'SUPER_ADMIN_ONLY',
        version: 1,
      }),
    })
    const adminRepository = fakeAdminRepository()

    await expect(
      updateFeatureFlag(
        { key: 'community_feature_enabled', enabled: true, expectedVersion: 1 },
        adminActor,
        { featureFlagRepository, adminRepository },
      ),
    ).rejects.toThrow(InsufficientRoleForFlagError)
    expect(featureFlagRepository.updateFeatureFlag).not.toHaveBeenCalled()
    expect(adminRepository.createAuditLog).not.toHaveBeenCalled()
  })

  it('allows SUPER_ADMIN to toggle a SUPER_ADMIN_ONLY flag', async () => {
    const featureFlagRepository = fakeFeatureFlagRepository({
      findFeatureFlagByKey: vi.fn().mockResolvedValue({
        key: 'community_feature_enabled',
        enabled: false,
        scope: 'SUPER_ADMIN_ONLY',
        version: 1,
      }),
      updateFeatureFlag: vi.fn().mockResolvedValue({
        key: 'community_feature_enabled',
        enabled: true,
        scope: 'SUPER_ADMIN_ONLY',
        version: 2,
      }),
    })
    const adminRepository = fakeAdminRepository()

    await expect(
      updateFeatureFlag(
        { key: 'community_feature_enabled', enabled: true, expectedVersion: 1 },
        superAdminActor,
        { featureFlagRepository, adminRepository },
      ),
    ).resolves.toBeDefined()
  })

  it('throws FeatureFlagNotFoundError for an unknown key', async () => {
    const featureFlagRepository = fakeFeatureFlagRepository({
      findFeatureFlagByKey: vi.fn().mockResolvedValue(null),
    })
    const adminRepository = fakeAdminRepository()

    await expect(
      updateFeatureFlag({ key: 'unknown_flag', enabled: true, expectedVersion: 1 }, adminActor, {
        featureFlagRepository,
        adminRepository,
      }),
    ).rejects.toThrow(FeatureFlagNotFoundError)
  })

  it('propagates FeatureFlagVersionConflictError from the repository without writing an audit log', async () => {
    const featureFlagRepository = fakeFeatureFlagRepository({
      updateFeatureFlag: vi.fn().mockRejectedValue(new FeatureFlagVersionConflictError()),
    })
    const adminRepository = fakeAdminRepository()

    await expect(
      updateFeatureFlag(
        { key: 'user_posting_enabled', enabled: true, expectedVersion: 1 },
        adminActor,
        { featureFlagRepository, adminRepository },
      ),
    ).rejects.toThrow(FeatureFlagVersionConflictError)
    expect(adminRepository.createAuditLog).not.toHaveBeenCalled()
  })

  it('records an audit log with before/after enabled values on success', async () => {
    const featureFlagRepository = fakeFeatureFlagRepository()
    const adminRepository = fakeAdminRepository()

    await updateFeatureFlag(
      { key: 'user_posting_enabled', enabled: true, expectedVersion: 1 },
      adminActor,
      { featureFlagRepository, adminRepository },
    )

    expect(adminRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        adminAccountId: 'admin-1',
        action: 'FEATURE_FLAG_UPDATE',
        targetType: 'FeatureFlag',
        targetId: 'user_posting_enabled',
        beforeValue: { enabled: false },
        afterValue: { enabled: true },
      }),
    )
  })
})
