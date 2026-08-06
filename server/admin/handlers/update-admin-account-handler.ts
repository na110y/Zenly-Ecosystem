import { readBody, createError, getRouterParam, type H3Event } from 'h3'
import { updateAdminAccountBodySchema } from '../dto/admin-accounts'
import {
  updateAdminAccount,
  AdminAccountNotFoundError,
  LastActiveSuperAdminError,
} from '../use-cases/update-admin-account'
import { requireSuperAdmin } from '../require-super-admin'
import { AdminRepository } from '../repository/admin-repository'
import { getPrismaClient } from '../../identity/db'

export interface UpdateAdminAccountHandlerConfig {
  databaseUrl: string
}

export async function handleUpdateAdminAccount(
  event: H3Event,
  config: UpdateAdminAccountHandlerConfig,
) {
  const actor = requireSuperAdmin(event)

  const targetId = getRouterParam(event, 'id')
  if (!targetId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing admin account id' })
  }

  const raw = await readBody(event)
  const result = updateAdminAccountBodySchema.safeParse(raw)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid admin account update payload' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const adminRepository = new AdminRepository(prisma)

  try {
    await updateAdminAccount(targetId, result.data, actor.adminAccountId, { adminRepository })
    return { status: 'ok' }
  } catch (error) {
    if (error instanceof AdminAccountNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: 'Admin account not found' })
    }
    if (error instanceof LastActiveSuperAdminError) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Cannot demote or disable the last active SUPER_ADMIN',
      })
    }
    throw error
  }
}
