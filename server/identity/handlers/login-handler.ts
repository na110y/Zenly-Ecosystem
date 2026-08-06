import { readBody, createError, setCookie, type H3Event } from 'h3'
import { loginBodySchema } from '../dto/login'
import { loginUser, InvalidCredentialsError, AccountSuspendedError } from '../use-cases/login-user'
import { UserRepository } from '../repository/user-repository'
import { getPrismaClient } from '../db'
import { USER_SESSION_COOKIE } from '../session'

export interface LoginHandlerConfig {
  databaseUrl: string
}

export async function handleLogin(event: H3Event, config: LoginHandlerConfig) {
  const raw = await readBody(event)
  const result = loginBodySchema.safeParse(raw)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid login payload' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const userRepository = new UserRepository(prisma)

  try {
    const { token, expiresAt } = await loginUser(result.data, { userRepository })
    setCookie(event, USER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })
    return { status: 'ok' }
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
    }
    if (error instanceof AccountSuspendedError) {
      throw createError({ statusCode: 403, statusMessage: 'Account suspended' })
    }
    throw error
  }
}
