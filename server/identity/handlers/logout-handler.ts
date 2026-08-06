import { getCookie, deleteCookie, type H3Event } from 'h3'
import { logoutUser } from '../use-cases/logout-user'
import { UserRepository } from '../repository/user-repository'
import { getPrismaClient } from '../db'
import { USER_SESSION_COOKIE } from '../session'

export interface LogoutHandlerConfig {
  databaseUrl: string
}

export async function handleLogout(event: H3Event, config: LogoutHandlerConfig) {
  const token = getCookie(event, USER_SESSION_COOKIE)

  const prisma = getPrismaClient(config.databaseUrl)
  const userRepository = new UserRepository(prisma)

  await logoutUser(token, { userRepository })
  deleteCookie(event, USER_SESSION_COOKIE, { path: '/' })

  return { status: 'ok' }
}
