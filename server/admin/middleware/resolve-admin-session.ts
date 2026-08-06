import { defineEventHandler, getCookie, type H3Event } from 'h3'
import { resolveAdminSession } from '../use-cases/resolve-admin-session'
import { AdminRepository } from '../repository/admin-repository'
import { getPrismaClient } from '../../identity/db'
import { setAdminContext } from '../context'
import { ADMIN_SESSION_COOKIE } from '../session'

export interface ResolveAdminSessionConfig {
  databaseUrl: string
}

export async function resolveAdminSessionMiddleware(
  event: H3Event,
  config: ResolveAdminSessionConfig,
) {
  const token = getCookie(event, ADMIN_SESSION_COOKIE)
  if (!token) {
    return
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const adminRepository = new AdminRepository(prisma)
  const resolved = await resolveAdminSession(token, { adminRepository })

  if (resolved) {
    setAdminContext(event, resolved)
  }
}

export default defineEventHandler((event) =>
  resolveAdminSessionMiddleware(event, { databaseUrl: useRuntimeConfig(event).databaseUrl }),
)
