import { readBody, createError, type H3Event } from 'h3'
import { totpActivateBodySchema } from '../dto/auth'
import {
  activateTotp,
  TotpNotSetUpError,
  TotpAlreadyActivatedError,
  InvalidTotpCodeError,
} from '../use-cases/activate-totp'
import { AdminRepository } from '../repository/admin-repository'
import { getPrismaClient } from '../../identity/db'
import { getAdminContext } from '../context'

export interface AdminTotpActivateHandlerConfig {
  databaseUrl: string
  totpEncryptionKey: string
}

export async function handleAdminTotpActivate(
  event: H3Event,
  config: AdminTotpActivateHandlerConfig,
) {
  const adminContext = getAdminContext(event)
  if (!adminContext) {
    throw createError({ statusCode: 401, statusMessage: 'Admin session required' })
  }

  const raw = await readBody(event)
  const result = totpActivateBodySchema.safeParse(raw)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid activation payload' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const adminRepository = new AdminRepository(prisma)

  try {
    await activateTotp(adminContext.adminAccountId, result.data.code, {
      adminRepository,
      totpEncryptionKey: config.totpEncryptionKey,
    })
    return { status: 'ok' }
  } catch (error) {
    if (error instanceof TotpNotSetUpError) {
      throw createError({ statusCode: 409, statusMessage: 'TOTP not set up' })
    }
    if (error instanceof TotpAlreadyActivatedError) {
      throw createError({ statusCode: 409, statusMessage: 'TOTP already activated' })
    }
    if (error instanceof InvalidTotpCodeError) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid TOTP code' })
    }
    throw error
  }
}
