// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import {
  resetPassword,
  InvalidResetTokenError,
  ExpiredResetTokenError,
  AlreadyConsumedResetTokenError,
} from '../../server/identity/use-cases/reset-password'
import type { UserRepository } from '../../server/identity/repository/user-repository'
import { hashToken } from '../../server/identity/token'

function fakeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findPasswordResetTokenByHash: vi.fn().mockResolvedValue(null),
    resetPasswordAndRevokeSessions: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as UserRepository
}

describe('resetPassword', () => {
  it('resets the password and revokes sessions on the happy path', async () => {
    const userRepository = fakeUserRepository({
      findPasswordResetTokenByHash: vi.fn().mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: hashToken('good-token'),
        expiresAt: new Date(Date.now() + 3600_000),
        consumedAt: null,
      }),
    })

    await resetPassword({ token: 'good-token', newPassword: 'newpassword123' }, { userRepository })

    expect(userRepository.resetPasswordAndRevokeSessions).toHaveBeenCalledWith(
      expect.objectContaining({ tokenId: 'token-1', userId: 'user-1' }),
    )
  })

  it('never passes the plaintext password to the repository', async () => {
    const userRepository = fakeUserRepository({
      findPasswordResetTokenByHash: vi.fn().mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: hashToken('good-token'),
        expiresAt: new Date(Date.now() + 3600_000),
        consumedAt: null,
      }),
    })

    await resetPassword(
      { token: 'good-token', newPassword: 'super-secret-new-pw' },
      { userRepository },
    )

    const call = (userRepository.resetPasswordAndRevokeSessions as ReturnType<typeof vi.fn>).mock
      .calls[0][0]
    expect(call.passwordHash).not.toBe('super-secret-new-pw')
    expect(call.passwordHash).not.toContain('super-secret-new-pw')
  })

  it('throws InvalidResetTokenError when the token does not exist', async () => {
    const userRepository = fakeUserRepository({
      findPasswordResetTokenByHash: vi.fn().mockResolvedValue(null),
    })

    await expect(
      resetPassword({ token: 'nope', newPassword: 'x' }, { userRepository }),
    ).rejects.toThrow(InvalidResetTokenError)
    expect(userRepository.resetPasswordAndRevokeSessions).not.toHaveBeenCalled()
  })

  it('throws ExpiredResetTokenError when the token has expired', async () => {
    const userRepository = fakeUserRepository({
      findPasswordResetTokenByHash: vi.fn().mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 1000),
        consumedAt: null,
      }),
    })

    await expect(
      resetPassword({ token: 'expired', newPassword: 'x' }, { userRepository }),
    ).rejects.toThrow(ExpiredResetTokenError)
  })

  it('throws AlreadyConsumedResetTokenError on replay', async () => {
    const userRepository = fakeUserRepository({
      findPasswordResetTokenByHash: vi.fn().mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600_000),
        consumedAt: new Date(),
      }),
    })

    await expect(
      resetPassword({ token: 'used', newPassword: 'x' }, { userRepository }),
    ).rejects.toThrow(AlreadyConsumedResetTokenError)
  })
})
