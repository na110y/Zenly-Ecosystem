// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { createPrismaClient } from '../../prisma/client'
import { UserRepository } from '../../server/identity/repository/user-repository'
import { hashPassword, verifyPassword } from '../../server/identity/password'
import { loginUser } from '../../server/identity/use-cases/login-user'
import { resolveSession } from '../../server/identity/use-cases/resolve-session'
import { requestPasswordReset } from '../../server/identity/use-cases/request-password-reset'
import {
  resetPassword,
  AlreadyConsumedResetTokenError,
} from '../../server/identity/use-cases/reset-password'
import type { EmailAdapter } from '../../server/identity/adapters/email-adapter'

describe('password reset flow (real PostgreSQL)', () => {
  let container: StartedPostgreSqlContainer
  let prisma: ReturnType<typeof createPrismaClient>
  let userRepository: UserRepository

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('zenly_test_pw_reset')
      .start()
    const databaseUrl = container.getConnectionUri()

    execSync('pnpm exec prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    })

    prisma = createPrismaClient(databaseUrl)
    userRepository = new UserRepository(prisma)
  }, 120_000)

  afterAll(async () => {
    await prisma?.$disconnect()
    await container?.stop()
  })

  function fakeEmailAdapter(): EmailAdapter {
    return { send: vi.fn().mockResolvedValue(undefined) }
  }

  function extractToken(emailAdapter: EmailAdapter): string {
    const sendMock = emailAdapter.send as ReturnType<typeof vi.fn>
    const html = sendMock.mock.calls[0][0].html as string
    return html.match(/token=([^"]+)/)![1]
  }

  it('resets the password and the new password verifies against the stored hash', async () => {
    const passwordHash = await hashPassword('old-password123')
    const user = await prisma.user.create({
      data: { email: 'pwreset-a@example.com', passwordHash, displayName: 'A' },
    })

    const emailAdapter = fakeEmailAdapter()
    await requestPasswordReset(
      { email: 'pwreset-a@example.com' },
      { userRepository, emailAdapter, resetUrlBase: 'https://example.com/reset' },
    )
    const token = extractToken(emailAdapter)

    await resetPassword({ token, newPassword: 'brand-new-password456' }, { userRepository })

    const updated = await prisma.user.findUnique({ where: { id: user.id } })
    expect(await verifyPassword(updated!.passwordHash, 'brand-new-password456')).toBe(true)
    expect(await verifyPassword(updated!.passwordHash, 'old-password123')).toBe(false)
  })

  it('revokes all active sessions when the password is reset', async () => {
    const passwordHash = await hashPassword('password123')
    await prisma.user.create({
      data: { email: 'pwreset-b@example.com', passwordHash, displayName: 'B' },
    })

    const { token: sessionToken } = await loginUser(
      { email: 'pwreset-b@example.com', password: 'password123' },
      { userRepository },
    )
    expect(await resolveSession(sessionToken, { userRepository })).not.toBeNull()

    const emailAdapter = fakeEmailAdapter()
    await requestPasswordReset(
      { email: 'pwreset-b@example.com' },
      { userRepository, emailAdapter, resetUrlBase: 'https://example.com/reset' },
    )
    const resetToken = extractToken(emailAdapter)
    await resetPassword({ token: resetToken, newPassword: 'new-password456' }, { userRepository })

    expect(await resolveSession(sessionToken, { userRepository })).toBeNull()
  })

  it('rejects replaying an already-consumed reset token', async () => {
    const passwordHash = await hashPassword('password123')
    await prisma.user.create({
      data: { email: 'pwreset-c@example.com', passwordHash, displayName: 'C' },
    })

    const emailAdapter = fakeEmailAdapter()
    await requestPasswordReset(
      { email: 'pwreset-c@example.com' },
      { userRepository, emailAdapter, resetUrlBase: 'https://example.com/reset' },
    )
    const token = extractToken(emailAdapter)

    await resetPassword({ token, newPassword: 'new-password456' }, { userRepository })
    await expect(
      resetPassword({ token, newPassword: 'another-password789' }, { userRepository }),
    ).rejects.toThrow(AlreadyConsumedResetTokenError)
  })

  it('after reset, login succeeds with the new password and fails with the old one', async () => {
    const passwordHash = await hashPassword('old-password123')
    await prisma.user.create({
      data: { email: 'pwreset-d@example.com', passwordHash, displayName: 'D' },
    })

    const emailAdapter = fakeEmailAdapter()
    await requestPasswordReset(
      { email: 'pwreset-d@example.com' },
      { userRepository, emailAdapter, resetUrlBase: 'https://example.com/reset' },
    )
    const token = extractToken(emailAdapter)
    await resetPassword({ token, newPassword: 'new-password456' }, { userRepository })

    await expect(
      loginUser(
        { email: 'pwreset-d@example.com', password: 'new-password456' },
        { userRepository },
      ),
    ).resolves.toBeDefined()
    await expect(
      loginUser(
        { email: 'pwreset-d@example.com', password: 'old-password123' },
        { userRepository },
      ),
    ).rejects.toThrow()
  })
})
