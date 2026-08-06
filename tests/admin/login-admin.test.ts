// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { hashPassword } from '../../server/identity/password'
import {
  loginAdmin,
  InvalidAdminCredentialsError,
  AdminAccountDisabledError,
} from '../../server/admin/use-cases/login-admin'
import type { AdminRepository } from '../../server/admin/repository/admin-repository'

function fakeAdminRepository(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(null),
    createAdminSession: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as AdminRepository
}

describe('loginAdmin', () => {
  it('creates a session with totpVerifiedAt implicitly NULL and returns a token on the happy path', async () => {
    const passwordHash = await hashPassword('password123')
    const adminRepository = fakeAdminRepository({
      findByEmail: vi.fn().mockResolvedValue({
        id: 'admin-1',
        email: 'a@example.com',
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      }),
    })

    const result = await loginAdmin(
      { email: 'a@example.com', password: 'password123' },
      { adminRepository },
    )

    expect(result.token).toBeDefined()
    expect(result.expiresAt).toBeInstanceOf(Date)
    expect(adminRepository.createAdminSession).toHaveBeenCalledWith(
      expect.objectContaining({ adminAccountId: 'admin-1' }),
    )
    const createCall = (adminRepository.createAdminSession as ReturnType<typeof vi.fn>).mock
      .calls[0][0]
    expect(createCall.totpVerifiedAt).toBeUndefined()
  })

  it('stores only the token hash, never the plaintext token', async () => {
    const passwordHash = await hashPassword('password123')
    const adminRepository = fakeAdminRepository({
      findByEmail: vi.fn().mockResolvedValue({
        id: 'admin-1',
        email: 'a@example.com',
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      }),
    })

    const result = await loginAdmin(
      { email: 'a@example.com', password: 'password123' },
      { adminRepository },
    )
    const createCall = (adminRepository.createAdminSession as ReturnType<typeof vi.fn>).mock
      .calls[0][0]

    expect(createCall.tokenHash).not.toBe(result.token)
  })

  it('throws InvalidAdminCredentialsError when the email does not exist', async () => {
    const adminRepository = fakeAdminRepository({ findByEmail: vi.fn().mockResolvedValue(null) })

    await expect(
      loginAdmin({ email: 'nobody@example.com', password: 'password123' }, { adminRepository }),
    ).rejects.toThrow(InvalidAdminCredentialsError)
    expect(adminRepository.createAdminSession).not.toHaveBeenCalled()
  })

  it('throws InvalidAdminCredentialsError when the password is wrong (generic error, no enumeration)', async () => {
    const passwordHash = await hashPassword('correct-password')
    const adminRepository = fakeAdminRepository({
      findByEmail: vi.fn().mockResolvedValue({
        id: 'admin-1',
        email: 'a@example.com',
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      }),
    })

    await expect(
      loginAdmin({ email: 'a@example.com', password: 'wrong-password' }, { adminRepository }),
    ).rejects.toThrow(InvalidAdminCredentialsError)
    expect(adminRepository.createAdminSession).not.toHaveBeenCalled()
  })

  it('throws AdminAccountDisabledError for a DISABLED account, without creating a session', async () => {
    const passwordHash = await hashPassword('password123')
    const adminRepository = fakeAdminRepository({
      findByEmail: vi.fn().mockResolvedValue({
        id: 'admin-1',
        email: 'a@example.com',
        passwordHash,
        role: 'ADMIN',
        status: 'DISABLED',
      }),
    })

    await expect(
      loginAdmin({ email: 'a@example.com', password: 'password123' }, { adminRepository }),
    ).rejects.toThrow(AdminAccountDisabledError)
    expect(adminRepository.createAdminSession).not.toHaveBeenCalled()
  })
})
