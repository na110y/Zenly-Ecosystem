// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import {
  getProfile,
  updateProfile,
  UserNotFoundError,
} from '../../server/identity/use-cases/profile'
import type { UserRepository } from '../../server/identity/repository/user-repository'

function fakeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findUserById: vi.fn().mockResolvedValue(null),
    updateProfile: vi.fn(),
    ...overrides,
  } as unknown as UserRepository
}

describe('getProfile', () => {
  it('returns the profile DTO without passwordHash', async () => {
    const userRepository = fakeUserRepository({
      findUserById: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
        displayName: 'A',
        status: 'ACTIVE',
        passwordHash: 'super-secret-hash',
      }),
    })

    const profile = await getProfile('user-1', { userRepository })

    expect(profile).toEqual({
      id: 'user-1',
      email: 'a@example.com',
      displayName: 'A',
      status: 'ACTIVE',
    })
    expect(profile).not.toHaveProperty('passwordHash')
  })

  it('throws UserNotFoundError when the user does not exist', async () => {
    const userRepository = fakeUserRepository({ findUserById: vi.fn().mockResolvedValue(null) })
    await expect(getProfile('missing', { userRepository })).rejects.toThrow(UserNotFoundError)
  })
})

describe('updateProfile', () => {
  it('updates displayName and returns the updated profile', async () => {
    const userRepository = fakeUserRepository({
      updateProfile: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
        displayName: 'New Name',
        status: 'ACTIVE',
        passwordHash: 'hash',
      }),
    })

    const result = await updateProfile('user-1', { displayName: 'New Name' }, { userRepository })

    expect(userRepository.updateProfile).toHaveBeenCalledWith('user-1', { displayName: 'New Name' })
    expect(result.displayName).toBe('New Name')
    expect(result).not.toHaveProperty('passwordHash')
  })
})
