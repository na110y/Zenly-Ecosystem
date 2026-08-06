import type { AdminAccount } from '@prisma/client'
import type { AdminRepository } from '../repository/admin-repository'

export async function listAdminAccounts(deps: {
  adminRepository: AdminRepository
}): Promise<AdminAccount[]> {
  return deps.adminRepository.listAdminAccounts()
}
