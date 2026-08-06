import { LastActiveSuperAdminError, type AdminRepository } from '../repository/admin-repository'
import type { AdminAccount } from '@prisma/client'

export { LastActiveSuperAdminError }
export class AdminAccountNotFoundError extends Error {}

export interface UpdateAdminAccountInput {
  role?: 'ADMIN' | 'SUPER_ADMIN'
  status?: 'ACTIVE' | 'DISABLED'
}

export async function updateAdminAccount(
  targetAdminAccountId: string,
  input: UpdateAdminAccountInput,
  actorAdminAccountId: string,
  deps: { adminRepository: AdminRepository },
): Promise<void> {
  const target = await deps.adminRepository.findById(targetAdminAccountId)
  if (!target) {
    throw new AdminAccountNotFoundError()
  }

  const beforeValue: Partial<Pick<AdminAccount, 'role' | 'status'>> = {}
  const afterValue: Partial<Pick<AdminAccount, 'role' | 'status'>> = {}

  if (input.role !== undefined && input.role !== target.role) {
    await deps.adminRepository.updateAdminAccountRole(targetAdminAccountId, target.role, input.role)
    beforeValue.role = target.role
    afterValue.role = input.role
  }

  if (input.status !== undefined && input.status !== target.status) {
    if (input.status === 'DISABLED') {
      const roleAfterUpdate = input.role ?? target.role
      await deps.adminRepository.disableAdminAccount(targetAdminAccountId, roleAfterUpdate)
    } else {
      await deps.adminRepository.enableAdminAccount(targetAdminAccountId)
    }
    beforeValue.status = target.status
    afterValue.status = input.status
  }

  if (Object.keys(afterValue).length === 0) {
    return
  }

  await deps.adminRepository.createAuditLog({
    adminAccountId: actorAdminAccountId,
    action: 'ADMIN_ACCOUNT_UPDATE',
    targetType: 'AdminAccount',
    targetId: targetAdminAccountId,
    beforeValue,
    afterValue,
  })
}
