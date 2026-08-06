import type { H3Event } from 'h3'
import { listFeatureFlags } from '../use-cases/list-feature-flags'
import { requireVerifiedAdmin } from '../require-verified-admin'
import { FeatureFlagRepository } from '../repository/feature-flag-repository'
import { getPrismaClient } from '../../identity/db'

export interface ListFeatureFlagsHandlerConfig {
  databaseUrl: string
}

export async function handleListFeatureFlags(
  event: H3Event,
  config: ListFeatureFlagsHandlerConfig,
) {
  requireVerifiedAdmin(event)

  const prisma = getPrismaClient(config.databaseUrl)
  const featureFlagRepository = new FeatureFlagRepository(prisma)

  const flags = await listFeatureFlags({ featureFlagRepository })
  return flags.map((flag) => ({
    key: flag.key,
    enabled: flag.enabled,
    scope: flag.scope,
    version: flag.version,
  }))
}
