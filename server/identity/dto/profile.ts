import { z } from 'zod'

export const updateProfileBodySchema = z
  .object({
    displayName: z.string().min(1).max(100),
  })
  .strict()

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>

export const updateNotificationPreferencesBodySchema = z
  .object({
    newStoriesEmail: z.boolean(),
    newChaptersEmail: z.boolean(),
    webPushEnabled: z.boolean(),
  })
  .strict()

export type UpdateNotificationPreferencesBody = z.infer<
  typeof updateNotificationPreferencesBodySchema
>
