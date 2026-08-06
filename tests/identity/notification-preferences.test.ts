// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../server/identity/use-cases/notification-preferences'
import type { UserRepository } from '../../server/identity/repository/user-repository'

function fakeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findNotificationPreferences: vi.fn().mockResolvedValue(null),
    upsertNotificationPreferences: vi.fn(),
    ...overrides,
  } as unknown as UserRepository
}

describe('getNotificationPreferences', () => {
  it('returns all-false defaults when no record exists yet (lazy default)', async () => {
    const userRepository = fakeUserRepository({
      findNotificationPreferences: vi.fn().mockResolvedValue(null),
    })

    const prefs = await getNotificationPreferences('user-1', { userRepository })

    expect(prefs).toEqual({
      newStoriesEmail: false,
      newChaptersEmail: false,
      webPushEnabled: false,
    })
  })

  it('returns the stored record when it exists', async () => {
    const userRepository = fakeUserRepository({
      findNotificationPreferences: vi.fn().mockResolvedValue({
        newStoriesEmail: true,
        newChaptersEmail: false,
        webPushEnabled: true,
      }),
    })

    const prefs = await getNotificationPreferences('user-1', { userRepository })

    expect(prefs).toEqual({ newStoriesEmail: true, newChaptersEmail: false, webPushEnabled: true })
  })
})

describe('updateNotificationPreferences', () => {
  it('upserts the preferences and returns the updated values', async () => {
    const userRepository = fakeUserRepository({
      upsertNotificationPreferences: vi.fn().mockResolvedValue({
        newStoriesEmail: true,
        newChaptersEmail: true,
        webPushEnabled: false,
      }),
    })

    const result = await updateNotificationPreferences(
      'user-1',
      { newStoriesEmail: true, newChaptersEmail: true, webPushEnabled: false },
      { userRepository },
    )

    expect(userRepository.upsertNotificationPreferences).toHaveBeenCalledWith('user-1', {
      newStoriesEmail: true,
      newChaptersEmail: true,
      webPushEnabled: false,
    })
    expect(result).toEqual({ newStoriesEmail: true, newChaptersEmail: true, webPushEnabled: false })
  })
})
