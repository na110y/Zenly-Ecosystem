// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { setupTotp, TotpAlreadyActivatedError } from '../../server/admin/use-cases/setup-totp'
import type { AdminRepository } from '../../server/admin/repository/admin-repository'

function fakeAdminRepository(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    findTotpCredential: vi.fn().mockResolvedValue(null),
    upsertTotpCredential: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as AdminRepository
}

const deps = {
  totpEncryptionKey: 'test-encryption-key-32-bytes-min',
  issuer: 'Zenly Stories',
  accountLabel: 'admin@example.com',
}

describe('setupTotp', () => {
  it('creates a not-yet-activated credential and returns a QR code data URL on the happy path', async () => {
    const adminRepository = fakeAdminRepository()

    const result = await setupTotp('admin-1', { adminRepository, ...deps })

    expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/)
    expect(adminRepository.upsertTotpCredential).toHaveBeenCalledWith(
      expect.objectContaining({ adminAccountId: 'admin-1' }),
    )
  })

  it('never returns the raw base32 secret in the result', async () => {
    const adminRepository = fakeAdminRepository()
    const result = await setupTotp('admin-1', { adminRepository, ...deps })
    expect(Object.keys(result)).toEqual(['qrCodeDataUrl'])
  })

  it('encrypts the secret before persisting it (never stores plaintext)', async () => {
    const adminRepository = fakeAdminRepository()
    await setupTotp('admin-1', { adminRepository, ...deps })

    const call = (adminRepository.upsertTotpCredential as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.secretEncrypted).not.toMatch(/^[A-Z2-7]+$/)
    expect(call.secretEncrypted.split(':')).toHaveLength(3)
  })

  it('allows re-setup (regenerating the secret) when a credential exists but is not yet activated', async () => {
    const adminRepository = fakeAdminRepository({
      findTotpCredential: vi.fn().mockResolvedValue({
        id: 'cred-1',
        adminAccountId: 'admin-1',
        secretEncrypted: 'old:encrypted:value',
        activatedAt: null,
      }),
    })

    await expect(setupTotp('admin-1', { adminRepository, ...deps })).resolves.toBeDefined()
    expect(adminRepository.upsertTotpCredential).toHaveBeenCalled()
  })

  it('throws TotpAlreadyActivatedError and does not touch the credential when already activated', async () => {
    const adminRepository = fakeAdminRepository({
      findTotpCredential: vi.fn().mockResolvedValue({
        id: 'cred-1',
        adminAccountId: 'admin-1',
        secretEncrypted: 'old:encrypted:value',
        activatedAt: new Date(),
      }),
    })

    await expect(setupTotp('admin-1', { adminRepository, ...deps })).rejects.toThrow(
      TotpAlreadyActivatedError,
    )
    expect(adminRepository.upsertTotpCredential).not.toHaveBeenCalled()
  })
})
