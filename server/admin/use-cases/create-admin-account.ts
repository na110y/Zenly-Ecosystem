import { hashPassword } from '../../identity/password'
import type { AdminRepository } from '../repository/admin-repository'
import type { AdminAccount } from '@prisma/client'

export interface CreateAdminAccountInput {
  email: string
  password: string
  role: 'ADMIN' | 'SUPER_ADMIN'
}

export async function createAdminAccount(
  input: CreateAdminAccountInput,
  actorAdminAccountId: string,
  deps: { adminRepository: AdminRepository },
): Promise<AdminAccount> {
  const passwordHash = await hashPassword(input.password)
  const account = await deps.adminRepository.createAdminAccount({
    email: input.email,
    passwordHash,
    role: input.role,
  })

  await deps.adminRepository.createAuditLog({
    adminAccountId: actorAdminAccountId,
    action: 'ADMIN_ACCOUNT_CREATE',
    targetType: 'AdminAccount',
    targetId: account.id,
    afterValue: { email: account.email, role: account.role, status: account.status },
  })

  return account
}
