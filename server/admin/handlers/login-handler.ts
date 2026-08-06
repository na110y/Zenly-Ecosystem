import { readBody, createError, setCookie, type H3Event } from 'h3'
import { adminLoginBodySchema } from '../dto/auth'
import {
  loginAdmin,
  InvalidAdminCredentialsError,
  AdminAccountDisabledError,
} from '../use-cases/login-admin'
import { AdminRepository } from '../repository/admin-repository'
import { getPrismaClient } from '../../identity/db'
import { ADMIN_SESSION_COOKIE } from '../session'

export interface AdminLoginHandlerConfig {
  databaseUrl: string
}

export async function handleAdminLogin(event: H3Event, config: AdminLoginHandlerConfig) {
  const raw = await readBody(event)
  const result = adminLoginBodySchema.safeParse(raw)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid login payload' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const adminRepository = new AdminRepository(prisma)

  try {
    const { token, expiresAt } = await loginAdmin(result.data, { adminRepository })
    setCookie(event, ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })
    return { status: 'ok' }
  } catch (error) {
    if (error instanceof InvalidAdminCredentialsError) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
    }
    if (error instanceof AdminAccountDisabledError) {
      throw createError({ statusCode: 403, statusMessage: 'Account disabled' })
    }
    throw error
  }
}
