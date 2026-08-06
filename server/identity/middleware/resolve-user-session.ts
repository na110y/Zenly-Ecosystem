import { defineEventHandler, getCookie, type H3Event } from 'h3'
import { resolveSession } from '../use-cases/resolve-session'
import { UserRepository } from '../repository/user-repository'
import { getPrismaClient } from '../db'
import { setUserContext } from '../context'
import { USER_SESSION_COOKIE } from '../session'

export interface ResolveUserSessionConfig {
  databaseUrl: string
}

export async function resolveUserSessionMiddleware(
  event: H3Event,
  config: ResolveUserSessionConfig,
) {
  const token = getCookie(event, USER_SESSION_COOKIE)
  if (!token) {
    return
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const userRepository = new UserRepository(prisma)
  const resolved = await resolveSession(token, { userRepository })

  if (resolved) {
    setUserContext(event, { userId: resolved.userId })
  }
}

export default defineEventHandler((event) =>
  resolveUserSessionMiddleware(event, { databaseUrl: useRuntimeConfig(event).databaseUrl }),
)
