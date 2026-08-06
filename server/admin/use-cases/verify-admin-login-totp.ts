import { Secret, TOTP } from 'otpauth'
import { hashToken } from '../../identity/token'
import { decryptTotpSecret } from '../totp-encryption'
import type { AdminRepository } from '../repository/admin-repository'

export class AdminSessionNotFoundError extends Error {}
export class TotpAlreadyVerifiedError extends Error {}
export class TotpNotActivatedError extends Error {}
export class InvalidTotpCodeError extends Error {}

export interface VerifyAdminLoginTotpDeps {
  adminRepository: AdminRepository
  totpEncryptionKey: string
}

export async function verifyAdminLoginTotp(
  token: string,
  code: string,
  deps: VerifyAdminLoginTotpDeps,
): Promise<void> {
  const session = await deps.adminRepository.findAdminSessionByTokenHash(hashToken(token))
  if (!session) {
    throw new AdminSessionNotFoundError()
  }
  if (session.revokedAt) {
    throw new AdminSessionNotFoundError()
  }
  if (session.expiresAt.getTime() < Date.now()) {
    throw new AdminSessionNotFoundError()
  }
  if (session.totpVerifiedAt) {
    throw new TotpAlreadyVerifiedError()
  }

  const credential = await deps.adminRepository.findTotpCredential(session.adminAccountId)
  if (!credential || !credential.activatedAt) {
    throw new TotpNotActivatedError()
  }

  const secretBase32 = decryptTotpSecret(credential.secretEncrypted, deps.totpEncryptionKey)
  const totp = new TOTP({ secret: Secret.fromBase32(secretBase32) })
  const delta = totp.validate({ token: code, window: 1 })

  if (delta === null) {
    throw new InvalidTotpCodeError()
  }

  await deps.adminRepository.markAdminSessionTotpVerified(session.id)
}
