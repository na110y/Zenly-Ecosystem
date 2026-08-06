// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { Secret, TOTP } from 'otpauth'
import { createPrismaClient } from '../../prisma/client'
import { AdminRepository } from '../../server/admin/repository/admin-repository'
import { hashPassword } from '../../server/identity/password'
import { loginAdmin } from '../../server/admin/use-cases/login-admin'
import { setupTotp } from '../../server/admin/use-cases/setup-totp'
import { activateTotp } from '../../server/admin/use-cases/activate-totp'
import {
  verifyAdminLoginTotp,
  InvalidTotpCodeError,
  TotpAlreadyVerifiedError,
} from '../../server/admin/use-cases/verify-admin-login-totp'
import { decryptTotpSecret } from '../../server/admin/totp-encryption'

const totpEncryptionKey = 'test-encryption-key-32-bytes-min'

describe('admin login step 1 -> TOTP setup/activate -> login step 2 (real PostgreSQL)', () => {
  let container: StartedPostgreSqlContainer
  let prisma: ReturnType<typeof createPrismaClient>
  let adminRepository: AdminRepository

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('zenly_test_admin_login_totp_flow')
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

  async function seedFullyActivatedAdmin(email: string, password: string) {
    const passwordHash = await hashPassword(password)
    const admin = await prisma.adminAccount.create({ data: { email, passwordHash, role: 'ADMIN' } })
    await setupTotp(admin.id, {
      adminRepository,
      totpEncryptionKey,
      issuer: 'Zenly Stories',
      accountLabel: email,
    })
    const credential = await prisma.adminTotpCredential.findUnique({
      where: { adminAccountId: admin.id },
    })
    const secretBase32 = decryptTotpSecret(credential!.secretEncrypted, totpEncryptionKey)
    const totp = new TOTP({ secret: Secret.fromBase32(secretBase32) })
    await activateTotp(admin.id, totp.generate(), { adminRepository, totpEncryptionKey })
    return { admin, totp }
  }

  it('full flow: login step 1 -> login step 2 sets totpVerifiedAt in the real database', async () => {
    const { admin, totp } = await seedFullyActivatedAdmin('flow-full@example.com', 'password123')

    const { token } = await loginAdmin(
      { email: 'flow-full@example.com', password: 'password123' },
      { adminRepository },
    )

    const preVerifySession = await prisma.adminSession.findFirst({
      where: { adminAccountId: admin.id },
    })
    expect(preVerifySession?.totpVerifiedAt).toBeNull()

    await verifyAdminLoginTotp(token, totp.generate(), { adminRepository, totpEncryptionKey })

    const postVerifySession = await prisma.adminSession.findFirst({
      where: { adminAccountId: admin.id },
    })
    expect(postVerifySession?.totpVerifiedAt).not.toBeNull()
  })

  it('rejects step 2 with an incorrect code and leaves totpVerifiedAt NULL in the database', async () => {
    const { admin } = await seedFullyActivatedAdmin('flow-wrong-code@example.com', 'password123')
    const { token } = await loginAdmin(
      { email: 'flow-wrong-code@example.com', password: 'password123' },
      { adminRepository },
    )

    await expect(
      verifyAdminLoginTotp(token, '000000', { adminRepository, totpEncryptionKey }),
    ).rejects.toThrow(InvalidTotpCodeError)

    const session = await prisma.adminSession.findFirst({ where: { adminAccountId: admin.id } })
    expect(session?.totpVerifiedAt).toBeNull()
  })

  it('rejects a second step-2 verification once the session already completed TOTP', async () => {
    const { totp } = await seedFullyActivatedAdmin('flow-double-verify@example.com', 'password123')
    const { token } = await loginAdmin(
      { email: 'flow-double-verify@example.com', password: 'password123' },
      { adminRepository },
    )

    await verifyAdminLoginTotp(token, totp.generate(), { adminRepository, totpEncryptionKey })

    await expect(
      verifyAdminLoginTotp(token, totp.generate(), { adminRepository, totpEncryptionKey }),
    ).rejects.toThrow(TotpAlreadyVerifiedError)
  })
})
