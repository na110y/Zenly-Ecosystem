import { Secret, TOTP } from 'otpauth'
import { toDataURL } from 'qrcode'
import { encryptTotpSecret } from '../totp-encryption'
import type { AdminRepository } from '../repository/admin-repository'

export class TotpAlreadyActivatedError extends Error {}

export interface SetupTotpDeps {
  adminRepository: AdminRepository
  totpEncryptionKey: string
  issuer: string
  accountLabel: string
}

export interface SetupTotpResult {
  qrCodeDataUrl: string
}

export async function setupTotp(
  adminAccountId: string,
  deps: SetupTotpDeps,
): Promise<SetupTotpResult> {
  const existing = await deps.adminRepository.findTotpCredential(adminAccountId)
  if (existing?.activatedAt) {
    throw new TotpAlreadyActivatedError()
  }

  const secret = new Secret()
  const totp = new TOTP({
    issuer: deps.issuer,
    label: deps.accountLabel,
    secret,
  })

  const secretEncrypted = encryptTotpSecret(secret.base32, deps.totpEncryptionKey)
  await deps.adminRepository.upsertTotpCredential({ adminAccountId, secretEncrypted })

  const qrCodeDataUrl = await toDataURL(totp.toString())

  return { qrCodeDataUrl }
}
