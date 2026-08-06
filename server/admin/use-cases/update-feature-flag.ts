import type { FeatureFlag } from '@prisma/client'
import {
  FeatureFlagNotFoundError,
  FeatureFlagVersionConflictError,
  type FeatureFlagRepository,
} from '../repository/feature-flag-repository'
import type { AdminRepository } from '../repository/admin-repository'
import type { AdminContext } from '../context'

export { FeatureFlagNotFoundError, FeatureFlagVersionConflictError }
export class InsufficientRoleForFlagError extends Error {}

export interface UpdateFeatureFlagInput {
  key: string
  enabled: boolean
  expectedVersion: number
}

export async function updateFeatureFlag(
  input: UpdateFeatureFlagInput,
  actor: AdminContext,
  deps: { featureFlagRepository: FeatureFlagRepository; adminRepository: AdminRepository },
): Promise<FeatureFlag> {
  const existing = await deps.featureFlagRepository.findFeatureFlagByKey(input.key)
  if (!existing) {
    throw new FeatureFlagNotFoundError()
  }

  if (existing.scope === 'SUPER_ADMIN_ONLY' && actor.role !== 'SUPER_ADMIN') {
    throw new InsufficientRoleForFlagError()
  }

  const updated = await deps.featureFlagRepository.updateFeatureFlag(
    input.key,
    input.enabled,
    input.expectedVersion,
    actor.adminAccountId,
  )

  await deps.adminRepository.createAuditLog({
    adminAccountId: actor.adminAccountId,
    action: 'FEATURE_FLAG_UPDATE',
    targetType: 'FeatureFlag',
    targetId: input.key,
    beforeValue: { enabled: existing.enabled },
    afterValue: { enabled: updated.enabled },
  })

  return updated
}
