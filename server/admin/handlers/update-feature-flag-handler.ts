import { readBody, createError, getRouterParam, type H3Event } from 'h3'
import { updateFeatureFlagBodySchema } from '../dto/feature-flags'
import {
  updateFeatureFlag,
  FeatureFlagNotFoundError,
  FeatureFlagVersionConflictError,
  InsufficientRoleForFlagError,
} from '../use-cases/update-feature-flag'
import { requireVerifiedAdmin } from '../require-verified-admin'
import { FeatureFlagRepository } from '../repository/feature-flag-repository'
import { AdminRepository } from '../repository/admin-repository'
import { getPrismaClient } from '../../identity/db'

export interface UpdateFeatureFlagHandlerConfig {
  databaseUrl: string
}

export async function handleUpdateFeatureFlag(
  event: H3Event,
  config: UpdateFeatureFlagHandlerConfig,
) {
  const actor = requireVerifiedAdmin(event)

  const key = getRouterParam(event, 'key')
  if (!key) {
    throw createError({ statusCode: 400, statusMessage: 'Missing feature flag key' })
  }

  const raw = await readBody(event)
  const result = updateFeatureFlagBodySchema.safeParse(raw)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid feature flag update payload' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const featureFlagRepository = new FeatureFlagRepository(prisma)
  const adminRepository = new AdminRepository(prisma)

  try {
    const updated = await updateFeatureFlag(
      { key, enabled: result.data.enabled, expectedVersion: result.data.expectedVersion },
      actor,
      { featureFlagRepository, adminRepository },
    )
    return {
      key: updated.key,
      enabled: updated.enabled,
      scope: updated.scope,
      version: updated.version,
    }
  } catch (error) {
    if (error instanceof FeatureFlagNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Feature flag not found' })
    }
    if (error instanceof InsufficientRoleForFlagError) {
      throw createError({ statusCode: 403, statusMessage: 'SUPER_ADMIN role required' })
    }
    if (error instanceof FeatureFlagVersionConflictError) {
      throw createError({ statusCode: 409, statusMessage: 'Feature flag version conflict' })
    }
    throw error
  }
}
