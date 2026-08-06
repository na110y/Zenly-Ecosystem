// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { createPrismaClient } from '../../prisma/client'
import {
  FeatureFlagRepository,
  FeatureFlagVersionConflictError,
} from '../../server/admin/repository/feature-flag-repository'
import { AdminRepository } from '../../server/admin/repository/admin-repository'
import {
  updateFeatureFlag,
  InsufficientRoleForFlagError,
} from '../../server/admin/use-cases/update-feature-flag'
import { hashPassword } from '../../server/identity/password'
import type { AdminContext } from '../../server/admin/context'

describe('feature flags scope enforcement + optimistic concurrency (real PostgreSQL)', () => {
  let container: StartedPostgreSqlContainer
  let prisma: ReturnType<typeof createPrismaClient>
  let featureFlagRepository: FeatureFlagRepository
  let adminRepository: AdminRepository

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('zenly_test_feature_flags_flow')
      .start()
    const databaseUrl = container.getConnectionUri()

    execSync('pnpm exec prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    })

    prisma = createPrismaClient(databaseUrl)
    featureFlagRepository = new FeatureFlagRepository(prisma)
    adminRepository = new AdminRepository(prisma)
  }, 120_000)

  afterAll(async () => {
    await prisma?.$disconnect()
    await container?.stop()
  })

  async function seedAdmin(email: string, role: 'ADMIN' | 'SUPER_ADMIN'): Promise<AdminContext> {
    const passwordHash = await hashPassword('password123')
    const admin = await prisma.adminAccount.create({ data: { email, passwordHash, role } })
    return { adminAccountId: admin.id, role, totpVerifiedAt: new Date() }
  }

  async function seedFlag(key: string, scope: 'ADMIN_MANAGEABLE' | 'SUPER_ADMIN_ONLY') {
    return prisma.featureFlag.create({ data: { key, enabled: false, scope } })
  }

  it('allows an ADMIN to toggle an ADMIN_MANAGEABLE flag and persists the change with an audit log', async () => {
    const admin = await seedAdmin('flow-flag-admin-1@example.com', 'ADMIN')
    const flag = await seedFlag('flow_admin_managed_1', 'ADMIN_MANAGEABLE')

    const updated = await updateFeatureFlag(
      { key: flag.key, enabled: true, expectedVersion: flag.version },
      admin,
      { featureFlagRepository, adminRepository },
    )

    expect(updated.enabled).toBe(true)
    expect(updated.version).toBe(flag.version + 1)

    const row = await prisma.featureFlag.findUnique({ where: { key: flag.key } })
    expect(row?.enabled).toBe(true)
    expect(row?.updatedByAdminId).toBe(admin.adminAccountId)

    const auditLog = await prisma.adminAuditLog.findFirst({
      where: { targetId: flag.key, action: 'FEATURE_FLAG_UPDATE' },
    })
    expect(auditLog).not.toBeNull()
  })

  it('rejects an ADMIN toggling a SUPER_ADMIN_ONLY flag, leaving the row unchanged in the database', async () => {
    const admin = await seedAdmin('flow-flag-admin-2@example.com', 'ADMIN')
    const flag = await seedFlag('flow_super_only_1', 'SUPER_ADMIN_ONLY')

    await expect(
      updateFeatureFlag({ key: flag.key, enabled: true, expectedVersion: flag.version }, admin, {
        featureFlagRepository,
        adminRepository,
      }),
    ).rejects.toThrow(InsufficientRoleForFlagError)

    const row = await prisma.featureFlag.findUnique({ where: { key: flag.key } })
    expect(row?.enabled).toBe(false)
    expect(row?.version).toBe(1)
  })

  it('allows a SUPER_ADMIN to toggle a SUPER_ADMIN_ONLY flag', async () => {
    const superAdmin = await seedAdmin('flow-flag-super-1@example.com', 'SUPER_ADMIN')
    const flag = await seedFlag('flow_super_only_2', 'SUPER_ADMIN_ONLY')

    const updated = await updateFeatureFlag(
      { key: flag.key, enabled: true, expectedVersion: flag.version },
      superAdmin,
      { featureFlagRepository, adminRepository },
    )

    expect(updated.enabled).toBe(true)
  })

  it('rejects a stale expectedVersion with a 409-mapped error, leaving the row unchanged', async () => {
    const admin = await seedAdmin('flow-flag-admin-3@example.com', 'ADMIN')
    const flag = await seedFlag('flow_stale_version', 'ADMIN_MANAGEABLE')

    await updateFeatureFlag(
      { key: flag.key, enabled: true, expectedVersion: flag.version },
      admin,
      { featureFlagRepository, adminRepository },
    )

    await expect(
      updateFeatureFlag({ key: flag.key, enabled: false, expectedVersion: flag.version }, admin, {
        featureFlagRepository,
        adminRepository,
      }),
    ).rejects.toThrow(FeatureFlagVersionConflictError)

    const row = await prisma.featureFlag.findUnique({ where: { key: flag.key } })
    expect(row?.enabled).toBe(true)
    expect(row?.version).toBe(2)
  })

  it('under real concurrent transactions, two updates against the same starting version allow exactly one to succeed', async () => {
    const admin = await seedAdmin('flow-flag-admin-4@example.com', 'ADMIN')
    const flag = await seedFlag('flow_concurrent_flag', 'ADMIN_MANAGEABLE')

    const results = await Promise.allSettled([
      updateFeatureFlag({ key: flag.key, enabled: true, expectedVersion: flag.version }, admin, {
        featureFlagRepository,
        adminRepository,
      }),
      updateFeatureFlag({ key: flag.key, enabled: true, expectedVersion: flag.version }, admin, {
        featureFlagRepository,
        adminRepository,
      }),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      FeatureFlagVersionConflictError,
    )

    const row = await prisma.featureFlag.findUnique({ where: { key: flag.key } })
    expect(row?.version).toBe(2)
  })
})
