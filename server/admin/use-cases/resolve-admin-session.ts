import { hashToken } from '../../identity/token'
import type { AdminRepository } from '../repository/admin-repository'
import type { AdminContext } from '../context'

export async function resolveAdminSession(
  token: string | undefined,
  deps: { adminRepository: AdminRepository },
): Promise<AdminContext | null> {
  if (!token) {
    return null
  }

  const session = await deps.adminRepository.findAdminSessionByTokenHash(hashToken(token))
  if (!session) {
    return null
  }
  if (session.revokedAt) {
    return null
  }
  if (session.expiresAt.getTime() < Date.now()) {
    return null
  }

  const admin = await deps.adminRepository.findById(session.adminAccountId)
  if (!admin) {
    return null
  }

  return {
    adminAccountId: admin.id,
    role: admin.role,
    totpVerifiedAt: session.totpVerifiedAt,
  }
}
