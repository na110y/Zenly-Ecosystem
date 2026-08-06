import type { createPrismaClient } from './client'

export const REQUIRED_FEATURE_FLAGS = [
  { key: 'user_posting_enabled', scope: 'ADMIN_MANAGEABLE' as const },
  { key: 'user_reporting_enabled', scope: 'ADMIN_MANAGEABLE' as const },
  { key: 'community_feature_enabled', scope: 'SUPER_ADMIN_ONLY' as const },
  { key: 'auto_send_notification_enabled', scope: 'SUPER_ADMIN_ONLY' as const },
]

export async function seedFeatureFlags(
  prisma: ReturnType<typeof createPrismaClient>,
): Promise<void> {
  for (const flag of REQUIRED_FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      create: { key: flag.key, enabled: false, scope: flag.scope },
      update: {},
    })
  }
}
