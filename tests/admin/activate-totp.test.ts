// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { Secret, TOTP } from 'otpauth'
import {
  activateTotp,
  TotpNotSetUpError,
  TotpAlreadyActivatedError,
  InvalidTotpCodeError,
} from '../../server/admin/use-cases/activate-totp'
import { encryptTotpSecret } from '../../server/admin/totp-encryption'
import type { AdminRepository } from '../../server/admin/repository/admin-repository'

const totpEncryptionKey = 'test-encryption-key-32-bytes-min'

function fakeAdminRepository(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    findTotpCredential: vi.fn().mockResolvedValue(null),
    activateTotpCredential: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as AdminRepository
}

function seededCredential(activatedAt: Date | null = null) {
  const secret = new Secret()
  const totp = new TOTP({ secret })
  const secretEncrypted = encryptTotpSecret(secret.base32, totpEncryptionKey)
  return { id: 'cred-1', adminAccountId: 'admin-1', secretEncrypted, activatedAt, totp }
}

describe('activateTotp', () => {
  it('activates the credential when the code is correct', async () => {
    const credential = seededCredential()
    const adminRepository = fakeAdminRepository({
      findTotpCredential: vi.fn().mockResolvedValue(credential),
    })
    const validCode = credential.totp.generate()

    await activateTotp('admin-1', validCode, { adminRepository, totpEncryptionKey })

    expect(adminRepository.activateTotpCredential).toHaveBeenCalledWith('cred-1')
  })

  it('rejects an incorrect code and does not activate', async () => {
    const credential = seededCredential()
    const adminRepository = fakeAdminRepository({
      findTotpCredential: vi.fn().mockResolvedValue(credential),
    })

    await expect(
      activateTotp('admin-1', '000000', { adminRepository, totpEncryptionKey }),
    ).rejects.toThrow(InvalidTotpCodeError)
    expect(adminRepository.activateTotpCredential).not.toHaveBeenCalled()
  })

  it('throws TotpNotSetUpError when no credential exists', async () => {
    const adminRepository = fakeAdminRepository({
      findTotpCredential: vi.fn().mockResolvedValue(null),
    })

    await expect(
      activateTotp('admin-1', '123456', { adminRepository, totpEncryptionKey }),
    ).rejects.toThrow(TotpNotSetUpError)
    expect(adminRepository.activateTotpCredential).not.toHaveBeenCalled()
  })

  it('throws TotpAlreadyActivatedError when the credential is already activated', async () => {
    const credential = seededCredential(new Date())
    const adminRepository = fakeAdminRepository({
      findTotpCredential: vi.fn().mockResolvedValue(credential),
    })
    const validCode = credential.totp.generate()

    await expect(
      activateTotp('admin-1', validCode, { adminRepository, totpEncryptionKey }),
    ).rejects.toThrow(TotpAlreadyActivatedError)
    expect(adminRepository.activateTotpCredential).not.toHaveBeenCalled()
  })
})
