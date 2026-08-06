import type { FeatureFlag } from '@prisma/client'
import type { FeatureFlagRepository } from '../repository/feature-flag-repository'

export async function listFeatureFlags(deps: {
  featureFlagRepository: FeatureFlagRepository
}): Promise<FeatureFlag[]> {
  return deps.featureFlagRepository.listFeatureFlags()
}
