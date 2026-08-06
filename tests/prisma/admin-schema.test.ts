// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { createPrismaClient } from '../../prisma/client'
import { bootstrapSuperAdmin } from '../../prisma/bootstrap-super-admin'
import { hashPassword } from '../../server/identity/password'

describe('admin identity schema (real PostgreSQL)', () => {
  let container: StartedPostgreSqlContainer
  let prisma: ReturnType<typeof createPrismaClient>

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('zenly_test_admin_schema')
      .start()
    const databaseUrl = container.getConnectionUri()

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

  it('does not break existing FeatureFlag/SystemSetting/User tables from prior migrations', async () => {
    await expect(prisma.featureFlag.count()).resolves.toBeDefined()
    await expect(prisma.systemSetting.count()).resolves.toBeDefined()
    await expect(prisma.user.count()).resolves.toBeDefined()
  })

  it('accepts a valid FeatureFlag.updatedByAdminId pointing to a real AdminAccount', async () => {
    const admin = await prisma.adminAccount.create({
      data: { email: 'fk-flag@example.com', passwordHash: 'x', role: 'ADMIN' },
    })
    const flag = await prisma.featureFlag.create({
      data: {
        key: `test_flag_${Date.now()}`,
        scope: 'ADMIN_MANAGEABLE',
        updatedByAdminId: admin.id,
      },
    })
    expect(flag.updatedByAdminId).toBe(admin.id)
  })

  it('rejects a FeatureFlag.updatedByAdminId pointing to a nonexistent AdminAccount', async () => {
    await expect(
      prisma.featureFlag.create({
        data: {
          key: `test_flag_invalid_${Date.now()}`,
          scope: 'ADMIN_MANAGEABLE',
          updatedByAdminId: '00000000-0000-0000-0000-000000000000',
        },
      }),
    ).rejects.toThrow()
  })

  it('accepts a valid SystemSetting.updatedByAdminId pointing to a real AdminAccount', async () => {
    const admin = await prisma.adminAccount.create({
      data: { email: 'fk-setting@example.com', passwordHash: 'x', role: 'ADMIN' },
    })
    const setting = await prisma.systemSetting.create({
      data: { key: `test_setting_${Date.now()}`, value: { x: 1 }, updatedByAdminId: admin.id },
    })
    expect(setting.updatedByAdminId).toBe(admin.id)
  })

  it('enforces AdminAccount.email uniqueness at the DB constraint level', async () => {
    await prisma.adminAccount.create({
      data: { email: 'dup-admin@example.com', passwordHash: 'x', role: 'ADMIN' },
    })
    await expect(
      prisma.adminAccount.create({
        data: { email: 'dup-admin@example.com', passwordHash: 'y', role: 'ADMIN' },
      }),
    ).rejects.toThrow()
  })

  it('enforces one AdminTotpCredential per AdminAccount (unique adminAccountId)', async () => {
    const admin = await prisma.adminAccount.create({
      data: { email: 'totp-unique@example.com', passwordHash: 'x', role: 'ADMIN' },
    })
    await prisma.adminTotpCredential.create({
      data: { adminAccountId: admin.id, secretEncrypted: 'enc' },
    })
    await expect(
      prisma.adminTotpCredential.create({
        data: { adminAccountId: admin.id, secretEncrypted: 'enc2' },
      }),
    ).rejects.toThrow()
  })

  it('enforces AdminSession.tokenHash uniqueness', async () => {
    const admin = await prisma.adminAccount.create({
      data: { email: 'session-unique@example.com', passwordHash: 'x', role: 'ADMIN' },
    })
    await prisma.adminSession.create({
      data: {
        adminAccountId: admin.id,
        tokenHash: 'same-hash',
        expiresAt: new Date(Date.now() + 3600_000),
      },
    })
    await expect(
      prisma.adminSession.create({
        data: {
          adminAccountId: admin.id,
          tokenHash: 'same-hash',
          expiresAt: new Date(Date.now() + 3600_000),
        },
      }),
    ).rejects.toThrow()
  })

  it('cascades delete from AdminAccount to AdminTotpCredential, AdminTotpRecoveryCode, AdminSession', async () => {
    const admin = await prisma.adminAccount.create({
      data: { email: 'cascade-admin@example.com', passwordHash: 'x', role: 'ADMIN' },
    })
    await prisma.adminTotpCredential.create({
      data: { adminAccountId: admin.id, secretEncrypted: 'enc' },
    })
    await prisma.adminTotpRecoveryCode.create({
      data: { adminAccountId: admin.id, codeHash: 'code' },
    })
    await prisma.adminSession.create({
      data: {
        adminAccountId: admin.id,
        tokenHash: 'cascade-token',
        expiresAt: new Date(Date.now() + 3600_000),
      },
    })

    await prisma.adminAccount.delete({ where: { id: admin.id } })

    expect(await prisma.adminTotpCredential.count({ where: { adminAccountId: admin.id } })).toBe(0)
    expect(await prisma.adminTotpRecoveryCode.count({ where: { adminAccountId: admin.id } })).toBe(
      0,
    )
    expect(await prisma.adminSession.count({ where: { adminAccountId: admin.id } })).toBe(0)
  })

  it('sets AdminAuditLog.adminAccountId to NULL (not deleted) when the admin is deleted', async () => {
    const admin = await prisma.adminAccount.create({
      data: { email: 'audit-admin@example.com', passwordHash: 'x', role: 'ADMIN' },
    })
    const log = await prisma.adminAuditLog.create({
      data: { adminAccountId: admin.id, action: 'TEST_ACTION', targetType: 'Test' },
    })

    await prisma.adminAccount.delete({ where: { id: admin.id } })

    const survivingLog = await prisma.adminAuditLog.findUnique({ where: { id: log.id } })
    expect(survivingLog).not.toBeNull()
    expect(survivingLog?.adminAccountId).toBeNull()
  })

  it('bootstrapSuperAdmin creates exactly one SUPER_ADMIN with a hashed password when no AdminAccount exists', async () => {
    const freshContainer = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('zenly_test_bootstrap')
      .start()
    const freshDatabaseUrl = freshContainer.getConnectionUri()
    execSync('pnpm exec prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: freshDatabaseUrl },
      stdio: 'inherit',
    })
    const freshPrisma = createPrismaClient(freshDatabaseUrl)

    try {
      await bootstrapSuperAdmin(freshPrisma, {
        email: 'super@example.com',
        password: 'password123',
      })

      const admins = await freshPrisma.adminAccount.findMany()
      expect(admins).toHaveLength(1)
      expect(admins[0].role).toBe('SUPER_ADMIN')
      expect(admins[0].passwordHash).not.toBe('password123')
      expect(await hashPassword('x')).not.toBe(admins[0].passwordHash)
    } finally {
      await freshPrisma.$disconnect()
      await freshContainer.stop()
    }
  }, 60_000)

  it('bootstrapSuperAdmin is idempotent: running it twice does not create a second AdminAccount', async () => {
    const freshContainer = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('zenly_test_bootstrap_idempotent')
      .start()
    const freshDatabaseUrl = freshContainer.getConnectionUri()
    execSync('pnpm exec prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: freshDatabaseUrl },
      stdio: 'inherit',
    })
    const freshPrisma = createPrismaClient(freshDatabaseUrl)

    try {
      await bootstrapSuperAdmin(freshPrisma, {
        email: 'super@example.com',
        password: 'password123',
      })
      await bootstrapSuperAdmin(freshPrisma, {
        email: 'different@example.com',
        password: 'differentpass',
      })

      const count = await freshPrisma.adminAccount.count()
      expect(count).toBe(1)
    } finally {
      await freshPrisma.$disconnect()
      await freshContainer.stop()
    }
  }, 60_000)
})
