// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { Secret, TOTP } from 'otpauth'
import { createPrismaClient } from '../../prisma/client'
import { AdminRepository } from '../../server/admin/repository/admin-repository'
import { hashPassword } from '../../server/identity/password'
import { loginAdmin } from '../../server/admin/use-cases/login-admin'
import { resolveAdminSession } from '../../server/admin/use-cases/resolve-admin-session'
import { setupTotp, TotpAlreadyActivatedError } from '../../server/admin/use-cases/setup-totp'
import { activateTotp, InvalidTotpCodeError } from '../../server/admin/use-cases/activate-totp'
import { decryptTotpSecret } from '../../server/admin/totp-encryption'

const totpEncryptionKey = 'test-encryption-key-32-bytes-min'

describe('admin login step 1 -> TOTP setup -> activate flow (real PostgreSQL)', () => {
  let container: StartedPostgreSqlContainer
  let prisma: ReturnType<typeof createPrismaClient>
  let adminRepository: AdminRepository

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('zenly_test_admin_totp_flow')
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

  async function seedAdmin(email: string, password: string) {
    const passwordHash = await hashPassword(password)
    return prisma.adminAccount.create({ data: { email, passwordHash, role: 'ADMIN' } })
  }

  it('full flow: login step 1 creates a session with totpVerifiedAt NULL, setup persists an encrypted credential, activate sets activatedAt', async () => {
    const admin = await seedAdmin('flow-totp@example.com', 'password123')

    const { token } = await loginAdmin(
      { email: 'flow-totp@example.com', password: 'password123' },
      { adminRepository },
    )

    const sessions = await prisma.adminSession.findMany({ where: { adminAccountId: admin.id } })
    expect(sessions).toHaveLength(1)
    expect(sessions[0].tokenHash).not.toBe(token)
    expect(sessions[0].totpVerifiedAt).toBeNull()

    const resolved = await resolveAdminSession(token, { adminRepository })
    expect(resolved).toEqual({
      adminAccountId: admin.id,
      role: 'ADMIN',
      totpVerifiedAt: null,
    })

    await setupTotp(admin.id, {
      adminRepository,
      totpEncryptionKey,
      issuer: 'Zenly Stories',
      accountLabel: admin.email,
    })

    const credential = await prisma.adminTotpCredential.findUnique({
      where: { adminAccountId: admin.id },
    })
    expect(credential).not.toBeNull()
    expect(credential?.activatedAt).toBeNull()
    expect(credential?.secretEncrypted).not.toMatch(/^[A-Z2-7]+$/)

    const secretBase32 = decryptTotpSecret(credential!.secretEncrypted, totpEncryptionKey)
    const totp = new TOTP({ secret: Secret.fromBase32(secretBase32) })
    const validCode = totp.generate()

    await activateTotp(admin.id, validCode, { adminRepository, totpEncryptionKey })

    const activatedCredential = await prisma.adminTotpCredential.findUnique({
      where: { adminAccountId: admin.id },
    })
    expect(activatedCredential?.activatedAt).not.toBeNull()
  })

  it('rejects activation with an incorrect code and leaves activatedAt NULL in the database', async () => {
    const admin = await seedAdmin('flow-totp-wrong@example.com', 'password123')
    await setupTotp(admin.id, {
      adminRepository,
      totpEncryptionKey,
      issuer: 'Zenly Stories',
      accountLabel: admin.email,
    })

    await expect(
      activateTotp(admin.id, '000000', { adminRepository, totpEncryptionKey }),
    ).rejects.toThrow(InvalidTotpCodeError)

    const credential = await prisma.adminTotpCredential.findUnique({
      where: { adminAccountId: admin.id },
    })
    expect(credential?.activatedAt).toBeNull()
  })

  it('rejects a second setup once TOTP is already activated for that admin', async () => {
    const admin = await seedAdmin('flow-totp-reject-resetup@example.com', 'password123')
    await setupTotp(admin.id, {
      adminRepository,
      totpEncryptionKey,
      issuer: 'Zenly Stories',
      accountLabel: admin.email,
    })
    const credential = await prisma.adminTotpCredential.findUnique({
      where: { adminAccountId: admin.id },
    })
    const secretBase32 = decryptTotpSecret(credential!.secretEncrypted, totpEncryptionKey)
    const totp = new TOTP({ secret: Secret.fromBase32(secretBase32) })
    await activateTotp(admin.id, totp.generate(), { adminRepository, totpEncryptionKey })

    await expect(
      setupTotp(admin.id, {
        adminRepository,
        totpEncryptionKey,
        issuer: 'Zenly Stories',
        accountLabel: admin.email,
      }),
    ).rejects.toThrow(TotpAlreadyActivatedError)
  })

  it('two concurrent admin logins both succeed and create two independent sessions', async () => {
    const admin = await seedAdmin('flow-totp-concurrent@example.com', 'password123')

    const [first, second] = await Promise.all([
      loginAdmin(
        { email: 'flow-totp-concurrent@example.com', password: 'password123' },
        { adminRepository },
      ),
      loginAdmin(
        { email: 'flow-totp-concurrent@example.com', password: 'password123' },
        { adminRepository },
      ),
    ])

    expect(first.token).not.toBe(second.token)
    const sessions = await prisma.adminSession.findMany({ where: { adminAccountId: admin.id } })
    expect(sessions).toHaveLength(2)
  })
})
