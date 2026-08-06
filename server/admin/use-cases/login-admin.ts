import { verifyPassword } from '../../identity/password'
import { generateToken, hashToken } from '../../identity/token'
import { adminSessionExpiryDate } from '../session'
import type { AdminRepository } from '../repository/admin-repository'

export class InvalidAdminCredentialsError extends Error {}
export class AdminAccountDisabledError extends Error {}

export interface LoginAdminInput {
  email: string
  password: string
}

export interface LoginAdminResult {
  token: string
  expiresAt: Date
}

export async function loginAdmin(
  input: LoginAdminInput,
  deps: { adminRepository: AdminRepository },
): Promise<LoginAdminResult> {
  const admin = await deps.adminRepository.findByEmail(input.email)
  if (!admin) {
    throw new InvalidAdminCredentialsError()
  }

  const passwordValid = await verifyPassword(admin.passwordHash, input.password)
  if (!passwordValid) {
    throw new InvalidAdminCredentialsError()
  }

  if (admin.status === 'DISABLED') {
    throw new AdminAccountDisabledError()
  }

  const token = generateToken()
  const expiresAt = adminSessionExpiryDate()
  await deps.adminRepository.createAdminSession({
    adminAccountId: admin.id,
    tokenHash: hashToken(token),
    expiresAt,
  })

  return { token, expiresAt }
}
