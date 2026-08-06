// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { Secret, TOTP } from 'otpauth'
import {
  verifyAdminLoginTotp,
  AdminSessionNotFoundError,
  TotpAlreadyVerifiedError,
  TotpNotActivatedError,
  InvalidTotpCodeError,
} from '../../server/admin/use-cases/verify-admin-login-totp'
import { encryptTotpSecret } from '../../server/admin/totp-encryption'
import type { AdminRepository } from '../../server/admin/repository/admin-repository'
import { hashToken } from '../../server/identity/token'

const totpEncryptionKey = 'test-encryption-key-32-bytes-min'

function fakeAdminRepository(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    findAdminSessionByTokenHash: vi.fn().mockResolvedValue(null),
    findTotpCredential: vi.fn().mockResolvedValue(null),
    markAdminSessionTotpVerified: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as AdminRepository
}

function activatedCredential() {
  const secret = new Secret()
  const totp = new TOTP({ secret })
  const secretEncrypted = encryptTotpSecret(secret.base32, totpEncryptionKey)
  return {
    id: 'cred-1',
    adminAccountId: 'admin-1',
    secretEncrypted,
    activatedAt: new Date(),
    totp,
  }
}

describe('verifyAdminLoginTotp', () => {
  it('sets totpVerifiedAt on the session for a correct code', async () => {
    const credential = activatedCredential()
    const adminRepository = fakeAdminRepository({
      findAdminSessionByTokenHash: vi.fn().mockResolvedValue({
        id: 'session-1',
        adminAccountId: 'admin-1',
        tokenHash: hashToken('good-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3600_000),
        totpVerifiedAt: null,
      }),
      findTotpCredential: vi.fn().mockResolvedValue(credential),
    })

    await verifyAdminLoginTotp('good-token', credential.totp.generate(), {
      adminRepository,
      totpEncryptionKey,
    })

    expect(adminRepository.markAdminSessionTotpVerified).toHaveBeenCalledWith('session-1')
  })

  it('rejects an incorrect code and does not verify the session', async () => {
    const credential = activatedCredential()
    const adminRepository = fakeAdminRepository({
      findAdminSessionByTokenHash: vi.fn().mockResolvedValue({
        id: 'session-1',
        adminAccountId: 'admin-1',
        tokenHash: hashToken('good-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3600_000),
        totpVerifiedAt: null,
      }),
      findTotpCredential: vi.fn().mockResolvedValue(credential),
    })

    await expect(
      verifyAdminLoginTotp('good-token', '000000', { adminRepository, totpEncryptionKey }),
    ).rejects.toThrow(InvalidTotpCodeError)
    expect(adminRepository.markAdminSessionTotpVerified).not.toHaveBeenCalled()
  })

  it('throws AdminSessionNotFoundError when the token matches no session', async () => {
    const adminRepository = fakeAdminRepository({
      findAdminSessionByTokenHash: vi.fn().mockResolvedValue(null),
    })

    await expect(
      verifyAdminLoginTotp('unknown-token', '123456', { adminRepository, totpEncryptionKey }),
    ).rejects.toThrow(AdminSessionNotFoundError)
  })

  it('throws AdminSessionNotFoundError for a revoked session', async () => {
    const adminRepository = fakeAdminRepository({
      findAdminSessionByTokenHash: vi.fn().mockResolvedValue({
        id: 'session-1',
        adminAccountId: 'admin-1',
        tokenHash: hashToken('revoked-token'),
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600_000),
        totpVerifiedAt: null,
      }),
    })

    await expect(
      verifyAdminLoginTotp('revoked-token', '123456', { adminRepository, totpEncryptionKey }),
    ).rejects.toThrow(AdminSessionNotFoundError)
  })

  it('throws AdminSessionNotFoundError for an expired session', async () => {
    const adminRepository = fakeAdminRepository({
      findAdminSessionByTokenHash: vi.fn().mockResolvedValue({
        id: 'session-1',
        adminAccountId: 'admin-1',
        tokenHash: hashToken('expired-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        totpVerifiedAt: null,
      }),
    })

    await expect(
      verifyAdminLoginTotp('expired-token', '123456', { adminRepository, totpEncryptionKey }),
    ).rejects.toThrow(AdminSessionNotFoundError)
  })

  it('throws TotpAlreadyVerifiedError when the session already completed TOTP', async () => {
    const adminRepository = fakeAdminRepository({
      findAdminSessionByTokenHash: vi.fn().mockResolvedValue({
        id: 'session-1',
        adminAccountId: 'admin-1',
        tokenHash: hashToken('verified-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3600_000),
        totpVerifiedAt: new Date(),
      }),
    })

    await expect(
      verifyAdminLoginTotp('verified-token', '123456', { adminRepository, totpEncryptionKey }),
    ).rejects.toThrow(TotpAlreadyVerifiedError)
  })

  it('throws TotpNotActivatedError when no credential has been activated yet', async () => {
    const adminRepository = fakeAdminRepository({
      findAdminSessionByTokenHash: vi.fn().mockResolvedValue({
        id: 'session-1',
        adminAccountId: 'admin-1',
        tokenHash: hashToken('good-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3600_000),
        totpVerifiedAt: null,
      }),
      findTotpCredential: vi.fn().mockResolvedValue(null),
    })

    await expect(
      verifyAdminLoginTotp('good-token', '123456', { adminRepository, totpEncryptionKey }),
    ).rejects.toThrow(TotpNotActivatedError)
  })

  it('throws TotpNotActivatedError when the credential exists but is not yet activated', async () => {
    const adminRepository = fakeAdminRepository({
      findAdminSessionByTokenHash: vi.fn().mockResolvedValue({
        id: 'session-1',
        adminAccountId: 'admin-1',
        tokenHash: hashToken('good-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3600_000),
        totpVerifiedAt: null,
      }),
      findTotpCredential: vi.fn().mockResolvedValue({
        id: 'cred-1',
        adminAccountId: 'admin-1',
        secretEncrypted: 'a:b:c',
        activatedAt: null,
      }),
    })

    await expect(
      verifyAdminLoginTotp('good-token', '123456', { adminRepository, totpEncryptionKey }),
    ).rejects.toThrow(TotpNotActivatedError)
  })
})
