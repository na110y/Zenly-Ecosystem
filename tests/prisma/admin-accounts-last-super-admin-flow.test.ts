// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { createPrismaClient } from '../../prisma/client'
import {
  AdminRepository,
  LastActiveSuperAdminError,
} from '../../server/admin/repository/admin-repository'
import { hashPassword } from '../../server/identity/password'
import { createAdminAccount } from '../../server/admin/use-cases/create-admin-account'
import { updateAdminAccount } from '../../server/admin/use-cases/update-admin-account'

describe('admin account management + last-active-SUPER_ADMIN protection (real PostgreSQL)', () => {
  let container: StartedPostgreSqlContainer
  let prisma: ReturnType<typeof createPrismaClient>
  let adminRepository: AdminRepository

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('zenly_test_admin_accounts_flow')
      .start()
    const databaseUrl = container.getConnectionUri()

    execSync('pnpm exec prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    })

    prisma = createPrismaClient(databaseUrl)
    adminRepository = new AdminRepository(prisma)
  }, 120_000)

  afterAll(async () => {
    await prisma?.$disconnect()
    await container?.stop()
  })

  beforeEach(async () => {
    // The last-active-SUPER_ADMIN guard counts across the whole table by design (that is
    // the real invariant), so tests asserting "the only remaining SUPER_ADMIN" must first
    // neutralize any ACTIVE SUPER_ADMIN rows seeded by earlier tests in this file, rather
    // than assume a fresh table — this keeps each test deterministic regardless of order.
    await prisma.adminAccount.updateMany({
      where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
      data: { status: 'DISABLED' },
    })
  })

  async function seedSuperAdmin(email: string) {
    const passwordHash = await hashPassword('password123')
    return prisma.adminAccount.create({ data: { email, passwordHash, role: 'SUPER_ADMIN' } })
  }

  it('createAdminAccount persists a real row and an audit log entry through real DB state', async () => {
    const actor = await seedSuperAdmin('flow-actor-create@example.com')

    const created = await createAdminAccount(
      { email: 'flow-created@example.com', password: 'password123', role: 'ADMIN' },
      actor.id,
      { adminRepository },
    )

    const row = await prisma.adminAccount.findUnique({ where: { id: created.id } })
    expect(row).not.toBeNull()
    expect(row?.passwordHash).not.toBe('password123')

    const auditLog = await prisma.adminAuditLog.findFirst({
      where: { targetId: created.id, action: 'ADMIN_ACCOUNT_CREATE' },
    })
    expect(auditLog).not.toBeNull()
    expect(auditLog?.adminAccountId).toBe(actor.id)
  })

  it('allows demoting a SUPER_ADMIN when another active SUPER_ADMIN remains', async () => {
    const staying = await seedSuperAdmin('flow-staying-1@example.com')
    const demoting = await seedSuperAdmin('flow-demoting-1@example.com')

    await updateAdminAccount(demoting.id, { role: 'ADMIN' }, staying.id, { adminRepository })

    const row = await prisma.adminAccount.findUnique({ where: { id: demoting.id } })
    expect(row?.role).toBe('ADMIN')
  })

  it('rejects demoting the last active SUPER_ADMIN, leaving the role unchanged in the database', async () => {
    const onlySuperAdmin = await seedSuperAdmin('flow-only-super@example.com')

    await expect(
      updateAdminAccount(onlySuperAdmin.id, { role: 'ADMIN' }, onlySuperAdmin.id, {
        adminRepository,
      }),
    ).rejects.toThrow(LastActiveSuperAdminError)

    const row = await prisma.adminAccount.findUnique({ where: { id: onlySuperAdmin.id } })
    expect(row?.role).toBe('SUPER_ADMIN')
  })

  it('rejects disabling the last active SUPER_ADMIN, leaving status unchanged in the database', async () => {
    const onlySuperAdmin = await seedSuperAdmin('flow-only-super-disable@example.com')

    await expect(
      updateAdminAccount(onlySuperAdmin.id, { status: 'DISABLED' }, onlySuperAdmin.id, {
        adminRepository,
      }),
    ).rejects.toThrow(LastActiveSuperAdminError)

    const row = await prisma.adminAccount.findUnique({ where: { id: onlySuperAdmin.id } })
    expect(row?.status).toBe('ACTIVE')
  })

  it('a DISABLED SUPER_ADMIN does not count toward the "active" quorum for a later demotion', async () => {
    const disabled = await seedSuperAdmin('flow-disabled-super@example.com')
    await prisma.adminAccount.update({ where: { id: disabled.id }, data: { status: 'DISABLED' } })
    const onlyActive = await seedSuperAdmin('flow-only-active-super@example.com')

    await expect(
      updateAdminAccount(onlyActive.id, { role: 'ADMIN' }, onlyActive.id, { adminRepository }),
    ).rejects.toThrow(LastActiveSuperAdminError)
  })

  it('re-enabling a DISABLED account works and is reflected in real DB state', async () => {
    const actor = await seedSuperAdmin('flow-actor-enable@example.com')
    const passwordHash = await hashPassword('password123')
    const disabledAdmin = await prisma.adminAccount.create({
      data: {
        email: 'flow-to-enable@example.com',
        passwordHash,
        role: 'ADMIN',
        status: 'DISABLED',
      },
    })

    await updateAdminAccount(disabledAdmin.id, { status: 'ACTIVE' }, actor.id, { adminRepository })

    const row = await prisma.adminAccount.findUnique({ where: { id: disabledAdmin.id } })
    expect(row?.status).toBe('ACTIVE')
  })

  it('under real concurrent transactions, demoting two of exactly two active SUPER_ADMINs allows at most one to succeed', async () => {
    const first = await seedSuperAdmin('flow-concurrent-1@example.com')
    const second = await seedSuperAdmin('flow-concurrent-2@example.com')

    const results = await Promise.allSettled([
      updateAdminAccount(first.id, { role: 'ADMIN' }, first.id, { adminRepository }),
      updateAdminAccount(second.id, { role: 'ADMIN' }, second.id, { adminRepository }),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(LastActiveSuperAdminError)

    const activeSuperAdmins = await prisma.adminAccount.count({
      where: { role: 'SUPER_ADMIN', status: 'ACTIVE', id: { in: [first.id, second.id] } },
    })
    expect(activeSuperAdmins).toBe(1)
  })
})
