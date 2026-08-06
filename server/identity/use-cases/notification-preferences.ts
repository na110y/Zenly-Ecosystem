import type { UserRepository } from '../repository/user-repository'

export interface NotificationPreferencesDto {
  newStoriesEmail: boolean
  newChaptersEmail: boolean
  webPushEnabled: boolean
}

const DEFAULT_PREFERENCES: NotificationPreferencesDto = {
  newStoriesEmail: false,
  newChaptersEmail: false,
  webPushEnabled: false,
}

export async function getNotificationPreferences(
  userId: string,
  deps: { userRepository: UserRepository },
): Promise<NotificationPreferencesDto> {
  const existing = await deps.userRepository.findNotificationPreferences(userId)
  if (!existing) {
    return DEFAULT_PREFERENCES
  }
  return {
    newStoriesEmail: existing.newStoriesEmail,
    newChaptersEmail: existing.newChaptersEmail,
    webPushEnabled: existing.webPushEnabled,
  }
}

export async function updateNotificationPreferences(
  userId: string,
  input: NotificationPreferencesDto,
  deps: { userRepository: UserRepository },
): Promise<NotificationPreferencesDto> {
  const updated = await deps.userRepository.upsertNotificationPreferences(userId, input)
  return {
    newStoriesEmail: updated.newStoriesEmail,
    newChaptersEmail: updated.newChaptersEmail,
    webPushEnabled: updated.webPushEnabled,
  }
}
