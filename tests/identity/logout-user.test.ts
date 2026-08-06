// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { logoutUser } from '../../server/identity/use-cases/logout-user'
import type { UserRepository } from '../../server/identity/repository/user-repository'
import { hashToken } from '../../server/identity/token'

function fakeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findUserSessionByTokenHash: vi.fn().mockResolvedValue(null),
    revokeUserSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as UserRepository
}

describe('logoutUser', () => {
  it('revokes the session matching the provided token', async () => {
    const userRepository = fakeUserRepository({
      findUserSessionByTokenHash: vi.fn().mockResolvedValue({
        id: 'session-1',
        tokenHash: hashToken('good-token'),
        revokedAt: null,
      }),
    })

    await logoutUser('good-token', { userRepository })

    expect(userRepository.revokeUserSession).toHaveBeenCalledWith('session-1')
  })

  it('does nothing (no throw) when no token is provided', async () => {
    const userRepository = fakeUserRepository()

    await expect(logoutUser(undefined, { userRepository })).resolves.toBeUndefined()
    expect(userRepository.revokeUserSession).not.toHaveBeenCalled()
  })

  it('does nothing (no throw) when the token does not match any session', async () => {
    const userRepository = fakeUserRepository({
      findUserSessionByTokenHash: vi.fn().mockResolvedValue(null),
    })

    await expect(logoutUser('unknown-token', { userRepository })).resolves.toBeUndefined()
    expect(userRepository.revokeUserSession).not.toHaveBeenCalled()
  })

  it('is idempotent: logging out an already-revoked session does not throw or re-revoke', async () => {
    const userRepository = fakeUserRepository({
      findUserSessionByTokenHash: vi.fn().mockResolvedValue({
        id: 'session-1',
        tokenHash: hashToken('already-revoked'),
        revokedAt: new Date(),
      }),
    })

    await expect(logoutUser('already-revoked', { userRepository })).resolves.toBeUndefined()
    expect(userRepository.revokeUserSession).not.toHaveBeenCalled()
  })
})
