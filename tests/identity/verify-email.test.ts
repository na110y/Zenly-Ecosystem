// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import {
  verifyEmail,
  InvalidVerificationTokenError,
  ExpiredVerificationTokenError,
  AlreadyConsumedVerificationTokenError,
} from '../../server/identity/use-cases/verify-email'
import type { UserRepository } from '../../server/identity/repository/user-repository'
import { hashToken } from '../../server/identity/token'

function fakeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: vi.fn(),
    createUser: vi.fn(),
    createEmailVerificationToken: vi.fn(),
    findEmailVerificationTokenByHash: vi.fn(),
    consumeEmailVerificationTokenAndActivateUser: vi.fn(),
    ...overrides,
  } as unknown as UserRepository
}

describe('verifyEmail', () => {
  it('activates the user and consumes the token on the happy path', async () => {
    const token = 'plain-token'
    const userRepository = fakeUserRepository({
      findEmailVerificationTokenByHash: vi.fn().mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 3600_000),
        consumedAt: null,
      }),
    })

    await verifyEmail({ token }, { userRepository })

    expect(userRepository.consumeEmailVerificationTokenAndActivateUser).toHaveBeenCalledWith(
      'token-1',
      'user-1',
    )
  })

  it('throws InvalidVerificationTokenError when the token does not exist', async () => {
    const userRepository = fakeUserRepository({
      findEmailVerificationTokenByHash: vi.fn().mockResolvedValue(null),
    })

    await expect(verifyEmail({ token: 'nope' }, { userRepository })).rejects.toThrow(
      InvalidVerificationTokenError,
    )
    expect(userRepository.consumeEmailVerificationTokenAndActivateUser).not.toHaveBeenCalled()
  })

  it('throws ExpiredVerificationTokenError when the token has expired', async () => {
    const userRepository = fakeUserRepository({
      findEmailVerificationTokenByHash: vi.fn().mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 1000),
        consumedAt: null,
      }),
    })

    await expect(verifyEmail({ token: 'expired' }, { userRepository })).rejects.toThrow(
      ExpiredVerificationTokenError,
    )
    expect(userRepository.consumeEmailVerificationTokenAndActivateUser).not.toHaveBeenCalled()
  })

  it('throws AlreadyConsumedVerificationTokenError on replay of a used token', async () => {
    const userRepository = fakeUserRepository({
      findEmailVerificationTokenByHash: vi.fn().mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600_000),
        consumedAt: new Date(),
      }),
    })

    await expect(verifyEmail({ token: 'used' }, { userRepository })).rejects.toThrow(
      AlreadyConsumedVerificationTokenError,
    )
    expect(userRepository.consumeEmailVerificationTokenAndActivateUser).not.toHaveBeenCalled()
  })

  it('checks consumedAt before expiresAt so a used token always reports as already-consumed', async () => {
    const userRepository = fakeUserRepository({
      findEmailVerificationTokenByHash: vi.fn().mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 1000),
        consumedAt: new Date(),
      }),
    })

    await expect(verifyEmail({ token: 'used-and-expired' }, { userRepository })).rejects.toThrow(
      AlreadyConsumedVerificationTokenError,
    )
  })
})
