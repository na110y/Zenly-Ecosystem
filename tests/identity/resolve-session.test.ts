// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { resolveSession } from '../../server/identity/use-cases/resolve-session'
import type { UserRepository } from '../../server/identity/repository/user-repository'
import { hashToken } from '../../server/identity/token'

function fakeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findUserSessionByTokenHash: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as UserRepository
}

describe('resolveSession', () => {
  it('returns null when no token is provided', async () => {
    const userRepository = fakeUserRepository()
    expect(await resolveSession(undefined, { userRepository })).toBeNull()
  })

  it('returns null when the token does not match any session', async () => {
    const userRepository = fakeUserRepository({
      findUserSessionByTokenHash: vi.fn().mockResolvedValue(null),
    })
    expect(await resolveSession('unknown', { userRepository })).toBeNull()
  })

  it('returns null for a revoked session', async () => {
    const userRepository = fakeUserRepository({
      findUserSessionByTokenHash: vi.fn().mockResolvedValue({
        userId: 'user-1',
        tokenHash: hashToken('revoked-token'),
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600_000),
      }),
    })
    expect(await resolveSession('revoked-token', { userRepository })).toBeNull()
  })

  it('returns null for an expired session', async () => {
    const userRepository = fakeUserRepository({
      findUserSessionByTokenHash: vi.fn().mockResolvedValue({
        userId: 'user-1',
        tokenHash: hashToken('expired-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      }),
    })
    expect(await resolveSession('expired-token', { userRepository })).toBeNull()
  })

  it('returns the userId for a valid, unexpired, unrevoked session', async () => {
    const userRepository = fakeUserRepository({
      findUserSessionByTokenHash: vi.fn().mockResolvedValue({
        userId: 'user-1',
        tokenHash: hashToken('good-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3600_000),
      }),
    })
    expect(await resolveSession('good-token', { userRepository })).toEqual({ userId: 'user-1' })
  })
})
