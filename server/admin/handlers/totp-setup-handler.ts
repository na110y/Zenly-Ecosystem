import { createError, type H3Event } from 'h3'
import { setupTotp, TotpAlreadyActivatedError } from '../use-cases/setup-totp'
import { AdminRepository } from '../repository/admin-repository'
import { getPrismaClient } from '../../identity/db'
import { getAdminContext } from '../context'

export interface AdminTotpSetupHandlerConfig {
  databaseUrl: string
  totpEncryptionKey: string
  issuer: string
}

export async function handleAdminTotpSetup(event: H3Event, config: AdminTotpSetupHandlerConfig) {
  const adminContext = getAdminContext(event)
  if (!adminContext) {
    throw createError({ statusCode: 401, statusMessage: 'Admin session required' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const adminRepository = new AdminRepository(prisma)
  const admin = await adminRepository.findById(adminContext.adminAccountId)
  if (!admin) {
    throw createError({ statusCode: 401, statusMessage: 'Admin session required' })
  }

  try {
    const result = await setupTotp(adminContext.adminAccountId, {
      adminRepository,
      totpEncryptionKey: config.totpEncryptionKey,
      issuer: config.issuer,
      accountLabel: admin.email,
    })
    return result
  } catch (error) {
    if (error instanceof TotpAlreadyActivatedError) {
      throw createError({ statusCode: 409, statusMessage: 'TOTP already activated' })
    }
    throw error
  }
}
