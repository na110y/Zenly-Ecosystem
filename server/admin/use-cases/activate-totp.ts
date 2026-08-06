import { Secret, TOTP } from 'otpauth'
import { decryptTotpSecret } from '../totp-encryption'
import type { AdminRepository } from '../repository/admin-repository'

export class TotpNotSetUpError extends Error {}
export class TotpAlreadyActivatedError extends Error {}
export class InvalidTotpCodeError extends Error {}

export interface ActivateTotpDeps {
  adminRepository: AdminRepository
  totpEncryptionKey: string
}

export async function activateTotp(
  adminAccountId: string,
  code: string,
  deps: ActivateTotpDeps,
): Promise<void> {
  const credential = await deps.adminRepository.findTotpCredential(adminAccountId)
  if (!credential) {
    throw new TotpNotSetUpError()
  }
  if (credential.activatedAt) {
    throw new TotpAlreadyActivatedError()
  }

  const secretBase32 = decryptTotpSecret(credential.secretEncrypted, deps.totpEncryptionKey)
  const totp = new TOTP({ secret: Secret.fromBase32(secretBase32) })
  const delta = totp.validate({ token: code, window: 1 })

  if (delta === null) {
    throw new InvalidTotpCodeError()
  }

  await deps.adminRepository.activateTotpCredential(credential.id)
}
