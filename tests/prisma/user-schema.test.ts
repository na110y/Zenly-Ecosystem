// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { createPrismaClient } from '../../prisma/client'

describe('user identity schema (real PostgreSQL)', () => {
  let container: StartedPostgreSqlContainer
  let prisma: ReturnType<typeof createPrismaClient>

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('zenly_test_user_schema')
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

  async function createUser(email: string) {
    return prisma.user.create({
      data: {
        email,
        passwordHash: 'hashed-not-real',
        displayName: 'Test User',
      },
    })
  }

  it('creates a User with default status REGISTERED', async () => {
    const user = await createUser('default-status@example.com')
    expect(user.status).toBe('REGISTERED')
    expect(user.emailVerifiedAt).toBeNull()
  })

  it('rejects a duplicate email at the database constraint level', async () => {
    await createUser('dup@example.com')
    await expect(createUser('dup@example.com')).rejects.toThrow()
  })

  it('rejects a duplicate tokenHash on EmailVerificationToken', async () => {
    const user = await createUser('token-dup@example.com')
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash: 'same-hash', expiresAt: new Date(Date.now() + 3600_000) },
    })
    await expect(
      prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: 'same-hash',
          expiresAt: new Date(Date.now() + 3600_000),
        },
      }),
    ).rejects.toThrow()
  })

  it('rejects a duplicate tokenHash on UserSession', async () => {
    const user = await createUser('session-dup@example.com')
    await prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: 'same-session-hash',
        expiresAt: new Date(Date.now() + 3600_000),
      },
    })
    await expect(
      prisma.userSession.create({
        data: {
          userId: user.id,
          tokenHash: 'same-session-hash',
          expiresAt: new Date(Date.now() + 3600_000),
        },
      }),
    ).rejects.toThrow()
  })

  it('cascades delete from User to EmailVerificationToken, PasswordResetToken, UserSession, UserNotificationPreference', async () => {
    const user = await createUser('cascade@example.com')
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: 'cascade-evt',
        expiresAt: new Date(Date.now() + 3600_000),
      },
    })
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: 'cascade-prt',
        expiresAt: new Date(Date.now() + 3600_000),
      },
    })
    await prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: 'cascade-session',
        expiresAt: new Date(Date.now() + 3600_000),
      },
    })
    await prisma.userNotificationPreference.create({ data: { userId: user.id } })

    await prisma.user.delete({ where: { id: user.id } })

    expect(await prisma.emailVerificationToken.count({ where: { userId: user.id } })).toBe(0)
    expect(await prisma.passwordResetToken.count({ where: { userId: user.id } })).toBe(0)
    expect(await prisma.userSession.count({ where: { userId: user.id } })).toBe(0)
    expect(await prisma.userNotificationPreference.count({ where: { userId: user.id } })).toBe(0)
  })

  it('UserNotificationPreference defaults every flag to false', async () => {
    const user = await createUser('prefs-default@example.com')
    const prefs = await prisma.userNotificationPreference.create({ data: { userId: user.id } })
    expect(prefs.newStoriesEmail).toBe(false)
    expect(prefs.newChaptersEmail).toBe(false)
    expect(prefs.webPushEnabled).toBe(false)
  })

  it('enforces one UserNotificationPreference per user (unique userId)', async () => {
    const user = await createUser('prefs-unique@example.com')
    await prisma.userNotificationPreference.create({ data: { userId: user.id } })
    await expect(
      prisma.userNotificationPreference.create({ data: { userId: user.id } }),
    ).rejects.toThrow()
  })
})
