// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { createPrismaClient } from '../../prisma/client'
import { seedFeatureFlags, REQUIRED_FEATURE_FLAGS } from '../../prisma/seed'

describe('prisma migration and seed (real PostgreSQL)', () => {
  let container: StartedPostgreSqlContainer
  let databaseUrl: string
  let prisma: ReturnType<typeof createPrismaClient>

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('zenly_test_migrate')
      .start()
    databaseUrl = container.getConnectionUri()

    execSync('pnpm exec prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    })

    prisma = createPrismaClient(databaseUrl)
  }, 120_000)

  afterAll(async () => {
    await prisma?.$disconnect()
    await container?.stop()
  })

  it('applies the migration and creates FeatureFlag/SystemSetting tables', async () => {
    const featureFlagCount = await prisma.featureFlag.count()
    const systemSettingCount = await prisma.systemSetting.count()
    expect(featureFlagCount).toBe(0)
    expect(systemSettingCount).toBe(0)
  })

  it('seeds exactly the 4 required feature flags, all disabled', async () => {
    await seedFeatureFlags(prisma)

    const flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } })
    expect(flags).toHaveLength(REQUIRED_FEATURE_FLAGS.length)
    for (const flag of flags) {
      expect(flag.enabled).toBe(false)
    }

    const flagsByKey = new Map(flags.map((flag) => [flag.key, flag]))
    for (const expected of REQUIRED_FEATURE_FLAGS) {
      expect(flagsByKey.get(expected.key)?.scope).toBe(expected.scope)
    }
  })

  it('is idempotent: seeding twice does not duplicate rows or error', async () => {
    await seedFeatureFlags(prisma)
    await seedFeatureFlags(prisma)

    const count = await prisma.featureFlag.count()
    expect(count).toBe(REQUIRED_FEATURE_FLAGS.length)
  })

  it('SystemSetting table accepts a JSONB value row', async () => {
    const created = await prisma.systemSetting.create({
      data: { key: 'test_setting', value: { example: true } },
    })
    expect(created.value).toEqual({ example: true })
    expect(created.version).toBe(1)

    await prisma.systemSetting.delete({ where: { id: created.id } })
  })
})
