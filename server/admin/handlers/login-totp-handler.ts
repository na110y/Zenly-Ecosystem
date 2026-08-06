import { readBody, createError, getCookie, type H3Event } from 'h3'
import { adminLoginTotpBodySchema } from '../dto/auth'
import {
  verifyAdminLoginTotp,
  AdminSessionNotFoundError,
  TotpAlreadyVerifiedError,
  TotpNotActivatedError,
  InvalidTotpCodeError,
} from '../use-cases/verify-admin-login-totp'
import { AdminRepository } from '../repository/admin-repository'
import { getPrismaClient } from '../../identity/db'
import { ADMIN_SESSION_COOKIE } from '../session'

export interface AdminLoginTotpHandlerConfig {
  databaseUrl: string
  totpEncryptionKey: string
}

export async function handleAdminLoginTotp(event: H3Event, config: AdminLoginTotpHandlerConfig) {
  const token = getCookie(event, ADMIN_SESSION_COOKIE)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Admin session required' })
  }

  const raw = await readBody(event)
  const result = adminLoginTotpBodySchema.safeParse(raw)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid TOTP payload' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const adminRepository = new AdminRepository(prisma)

  try {
    await verifyAdminLoginTotp(token, result.data.code, {
      adminRepository,
      totpEncryptionKey: config.totpEncryptionKey,
    })
    return { status: 'ok' }
  } catch (error) {
    if (error instanceof AdminSessionNotFoundError) {
      throw createError({ statusCode: 401, statusMessage: 'Admin session required' })
    }
    if (error instanceof TotpAlreadyVerifiedError) {
      throw createError({ statusCode: 409, statusMessage: 'TOTP already verified' })
    }
    if (error instanceof TotpNotActivatedError) {
      throw createError({ statusCode: 409, statusMessage: 'TOTP not activated' })
    }
    if (error instanceof InvalidTotpCodeError) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid TOTP code' })
    }
    throw error
  }
}
