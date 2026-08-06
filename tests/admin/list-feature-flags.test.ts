// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { listFeatureFlags } from '../../server/admin/use-cases/list-feature-flags'
import type { FeatureFlagRepository } from '../../server/admin/repository/feature-flag-repository'

describe('listFeatureFlags', () => {
  it('returns whatever the repository returns', async () => {
    const flags = [
      { key: 'user_posting_enabled', enabled: false, scope: 'ADMIN_MANAGEABLE', version: 1 },
      { key: 'community_feature_enabled', enabled: false, scope: 'SUPER_ADMIN_ONLY', version: 1 },
    ]
    const featureFlagRepository = {
      listFeatureFlags: vi.fn().mockResolvedValue(flags),
    } as unknown as FeatureFlagRepository

    const result = await listFeatureFlags({ featureFlagRepository })

    expect(result).toEqual(flags)
  })
})
