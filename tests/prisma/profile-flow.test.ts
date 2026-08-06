// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { createPrismaClient } from '../../prisma/client'
import { UserRepository } from '../../server/identity/repository/user-repository'
import { hashPassword } from '../../server/identity/password'
import { getProfile, updateProfile } from '../../server/identity/use-cases/profile'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../server/identity/use-cases/notification-preferences'

describe('profile + notification preferences flow (real PostgreSQL)', () => {
  let container: StartedPostgreSqlContainer
  let prisma: ReturnType<typeof createPrismaClient>
  let userRepository: UserRepository

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('zenly_test_profile')
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

  it('reads and updates the profile against real DB state', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await prisma.user.create({
      data: { email: 'profile-a@example.com', passwordHash, displayName: 'Original Name' },
    })

    const profile = await getProfile(user.id, { userRepository })
    expect(profile.displayName).toBe('Original Name')

    await updateProfile(user.id, { displayName: 'Updated Name' }, { userRepository })

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } })
    expect(updatedUser?.displayName).toBe('Updated Name')
  })

  it('lazily creates a UserNotificationPreference row only on first write, not on first read', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await prisma.user.create({
      data: { email: 'profile-b@example.com', passwordHash, displayName: 'B' },
    })

    const beforeAnyWrite = await getNotificationPreferences(user.id, { userRepository })
    expect(beforeAnyWrite).toEqual({
      newStoriesEmail: false,
      newChaptersEmail: false,
      webPushEnabled: false,
    })

    const rowBeforeWrite = await prisma.userNotificationPreference.findUnique({
      where: { userId: user.id },
    })
    expect(rowBeforeWrite).toBeNull()

    await updateNotificationPreferences(
      user.id,
      { newStoriesEmail: true, newChaptersEmail: false, webPushEnabled: true },
      { userRepository },
    )

    const rowAfterWrite = await prisma.userNotificationPreference.findUnique({
      where: { userId: user.id },
    })
    expect(rowAfterWrite).not.toBeNull()
    expect(rowAfterWrite?.newStoriesEmail).toBe(true)
    expect(rowAfterWrite?.webPushEnabled).toBe(true)
  })

  it('upserting preferences twice does not create a duplicate row (idempotent)', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await prisma.user.create({
      data: { email: 'profile-c@example.com', passwordHash, displayName: 'C' },
    })

    await updateNotificationPreferences(
      user.id,
      { newStoriesEmail: true, newChaptersEmail: true, webPushEnabled: true },
      { userRepository },
    )
    await updateNotificationPreferences(
      user.id,
      { newStoriesEmail: false, newChaptersEmail: true, webPushEnabled: false },
      { userRepository },
    )

    const count = await prisma.userNotificationPreference.count({ where: { userId: user.id } })
    expect(count).toBe(1)

    const final = await getNotificationPreferences(user.id, { userRepository })
    expect(final).toEqual({ newStoriesEmail: false, newChaptersEmail: true, webPushEnabled: false })
  })
})
