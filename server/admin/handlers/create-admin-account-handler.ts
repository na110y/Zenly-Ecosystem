import { readBody, createError, type H3Event } from 'h3'
import { createAdminAccountBodySchema } from '../dto/admin-accounts'
import { createAdminAccount } from '../use-cases/create-admin-account'
import { requireSuperAdmin } from '../require-super-admin'
import { AdminRepository } from '../repository/admin-repository'
import { getPrismaClient } from '../../identity/db'

export interface CreateAdminAccountHandlerConfig {
  databaseUrl: string
}

export async function handleCreateAdminAccount(
  event: H3Event,
  config: CreateAdminAccountHandlerConfig,
) {
  const actor = requireSuperAdmin(event)

  const raw = await readBody(event)
  const result = createAdminAccountBodySchema.safeParse(raw)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid admin account payload' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const adminRepository = new AdminRepository(prisma)

  try {
    const account = await createAdminAccount(result.data, actor.adminAccountId, {
      adminRepository,
    })
    return { id: account.id, email: account.email, role: account.role, status: account.status }
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      throw createError({ statusCode: 409, statusMessage: 'Email already in use' })
    }
    throw error
  }
}
