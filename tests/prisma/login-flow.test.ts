// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { createPrismaClient } from '../../prisma/client'
import { UserRepository } from '../../server/identity/repository/user-repository'
import { hashPassword } from '../../server/identity/password'
import { loginUser, InvalidCredentialsError } from '../../server/identity/use-cases/login-user'
import { logoutUser } from '../../server/identity/use-cases/logout-user'
import { resolveSession } from '../../server/identity/use-cases/resolve-session'

describe('login + logout + session resolution flow (real PostgreSQL)', () => {
  let container: StartedPostgreSqlContainer
  let prisma: ReturnType<typeof createPrismaClient>
  let userRepository: UserRepository

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('zenly_test_login_flow')
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

  async function seedUser(email: string, password: string) {
    const passwordHash = await hashPassword(password)
    return prisma.user.create({ data: { email, passwordHash, displayName: 'Test' } })
  }

  it('login persists a UserSession row with a hashed (not plaintext) token', async () => {
    await seedUser('flow-login@example.com', 'password123')

    const { token } = await loginUser(
      { email: 'flow-login@example.com', password: 'password123' },
      { userRepository },
    )

    const sessions = await prisma.userSession.findMany({
      where: { user: { email: 'flow-login@example.com' } },
    })
    expect(sessions).toHaveLength(1)
    expect(sessions[0].tokenHash).not.toBe(token)
    expect(sessions[0].revokedAt).toBeNull()
  })

  it('resolveSession accepts a token immediately after login through real DB state', async () => {
    await seedUser('flow-resolve@example.com', 'password123')
    const { token } = await loginUser(
      { email: 'flow-resolve@example.com', password: 'password123' },
      { userRepository },
    )

    const resolved = await resolveSession(token, { userRepository })
    expect(resolved).not.toBeNull()
  })

  it('logout revokes the session, and the same token is rejected by resolveSession afterward', async () => {
    await seedUser('flow-logout@example.com', 'password123')
    const { token } = await loginUser(
      { email: 'flow-logout@example.com', password: 'password123' },
      { userRepository },
    )

    expect(await resolveSession(token, { userRepository })).not.toBeNull()

    await logoutUser(token, { userRepository })

    expect(await resolveSession(token, { userRepository })).toBeNull()
  })

  it('rejects login with the wrong password against a real stored hash', async () => {
    await seedUser('flow-wrong-pw@example.com', 'correct-password')

    await expect(
      loginUser(
        { email: 'flow-wrong-pw@example.com', password: 'wrong-password' },
        { userRepository },
      ),
    ).rejects.toThrow(InvalidCredentialsError)
  })

  it('two concurrent logins for the same user both succeed and create two independent sessions', async () => {
    await seedUser('flow-concurrent@example.com', 'password123')

    const [first, second] = await Promise.all([
      loginUser(
        { email: 'flow-concurrent@example.com', password: 'password123' },
        { userRepository },
      ),
      loginUser(
        { email: 'flow-concurrent@example.com', password: 'password123' },
        { userRepository },
      ),
    ])

    expect(first.token).not.toBe(second.token)
    const sessions = await prisma.userSession.findMany({
      where: { user: { email: 'flow-concurrent@example.com' } },
    })
    expect(sessions).toHaveLength(2)
  })
})
