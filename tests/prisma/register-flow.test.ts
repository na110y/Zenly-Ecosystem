// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { createPrismaClient } from '../../prisma/client'
import { UserRepository } from '../../server/identity/repository/user-repository'
import { registerUser } from '../../server/identity/use-cases/register-user'
import {
  verifyEmail,
  AlreadyConsumedVerificationTokenError,
} from '../../server/identity/use-cases/verify-email'
import { generateToken, hashToken } from '../../server/identity/token'
import type { EmailAdapter } from '../../server/identity/adapters/email-adapter'

describe('register + verify-email flow (real PostgreSQL)', () => {
  let container: StartedPostgreSqlContainer
  let prisma: ReturnType<typeof createPrismaClient>
  let userRepository: UserRepository

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('zenly_test_register_flow')
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

  function fakeEmailAdapter(): EmailAdapter & { sentTo: string[] } {
    const sentTo: string[] = []
    return {
      sentTo,
      send: vi.fn(async (input) => {
        sentTo.push(input.to)
      }),
    }
  }

  it('registers a user, persists a hashed token, and verify-email activates the account', async () => {
    const emailAdapter = fakeEmailAdapter()

    await registerUser(
      { email: 'flow@example.com', password: 'password123', displayName: 'Flow User' },
      { userRepository, emailAdapter, verifyUrlBase: 'https://example.com/verify' },
    )

    const user = await prisma.user.findUnique({ where: { email: 'flow@example.com' } })
    expect(user?.status).toBe('REGISTERED')

    const tokenRecord = await prisma.emailVerificationToken.findFirst({
      where: { userId: user!.id },
    })
    expect(tokenRecord).not.toBeNull()
    expect(tokenRecord!.consumedAt).toBeNull()

    // The use case never exposes the plaintext token to the test directly (it only reaches
    // the email body); reconstruct via a controlled adapter capture instead of parsing HTML.
    const capturedHtml = (emailAdapter.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
      .html as string
    const tokenMatch = capturedHtml.match(/token=([^"]+)/)
    expect(tokenMatch).not.toBeNull()
    const plainToken = tokenMatch![1]
    expect(hashToken(plainToken)).toBe(tokenRecord!.tokenHash)

    await verifyEmail({ token: plainToken }, { userRepository })

    const verifiedUser = await prisma.user.findUnique({ where: { email: 'flow@example.com' } })
    expect(verifiedUser?.status).toBe('EMAIL_VERIFIED')
    expect(verifiedUser?.emailVerifiedAt).not.toBeNull()

    const consumedToken = await prisma.emailVerificationToken.findUnique({
      where: { id: tokenRecord!.id },
    })
    expect(consumedToken?.consumedAt).not.toBeNull()
  })

  it('rejects replaying an already-consumed token and does not change state twice', async () => {
    const userRepository2 = new UserRepository(prisma)
    const emailAdapter = fakeEmailAdapter()

    await registerUser(
      { email: 'replay@example.com', password: 'password123', displayName: 'Replay User' },
      {
        userRepository: userRepository2,
        emailAdapter,
        verifyUrlBase: 'https://example.com/verify',
      },
    )

    const capturedHtml = (emailAdapter.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
      .html as string
    const plainToken = capturedHtml.match(/token=([^"]+)/)![1]

    await verifyEmail({ token: plainToken }, { userRepository: userRepository2 })
    await expect(
      verifyEmail({ token: plainToken }, { userRepository: userRepository2 }),
    ).rejects.toThrow(AlreadyConsumedVerificationTokenError)

    const user = await prisma.user.findUnique({ where: { email: 'replay@example.com' } })
    expect(user?.status).toBe('EMAIL_VERIFIED')
  })

  it('registering with a duplicate email does not create a second User row (DB-enforced)', async () => {
    const emailAdapter = fakeEmailAdapter()
    await registerUser(
      { email: 'dup-flow@example.com', password: 'password123', displayName: 'First' },
      { userRepository, emailAdapter, verifyUrlBase: 'https://example.com/verify' },
    )
    await registerUser(
      { email: 'dup-flow@example.com', password: 'different-password', displayName: 'Second' },
      { userRepository, emailAdapter, verifyUrlBase: 'https://example.com/verify' },
    )

    const count = await prisma.user.count({ where: { email: 'dup-flow@example.com' } })
    expect(count).toBe(1)
  })

  it('two concurrent registrations for the same email both resolve without throwing and result in exactly one User row (race safety)', async () => {
    const emailAdapter = fakeEmailAdapter()
    const email = `concurrent-${generateToken()}@example.com`

    const results = await Promise.allSettled([
      registerUser(
        { email, password: 'password123', displayName: 'Racer A' },
        { userRepository, emailAdapter, verifyUrlBase: 'https://example.com/verify' },
      ),
      registerUser(
        { email, password: 'password123', displayName: 'Racer B' },
        { userRepository, emailAdapter, verifyUrlBase: 'https://example.com/verify' },
      ),
    ])

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true)

    const count = await prisma.user.count({ where: { email } })
    expect(count).toBe(1)
  })
})
