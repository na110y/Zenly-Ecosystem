import type { H3Event } from 'h3'
import { listAdminAccounts } from '../use-cases/list-admin-accounts'
import { requireSuperAdmin } from '../require-super-admin'
import { AdminRepository } from '../repository/admin-repository'
import { getPrismaClient } from '../../identity/db'

export interface ListAdminAccountsHandlerConfig {
  databaseUrl: string
}

export async function handleListAdminAccounts(
  event: H3Event,
  config: ListAdminAccountsHandlerConfig,
) {
  requireSuperAdmin(event)

  const prisma = getPrismaClient(config.databaseUrl)
  const adminRepository = new AdminRepository(prisma)

  const accounts = await listAdminAccounts({ adminRepository })
  return accounts.map((account) => ({
    id: account.id,
    email: account.email,
    role: account.role,
    status: account.status,
    createdAt: account.createdAt,
  }))
}
