import { z } from 'zod';

const updateProfileBodySchema = z.object({
  displayName: z.string().min(1).max(100)
}).strict();
const updateNotificationPreferencesBodySchema = z.object({
  newStoriesEmail: z.boolean(),
  newChaptersEmail: z.boolean(),
  webPushEnabled: z.boolean()
}).strict();

export { updateProfileBodySchema as a, updateNotificationPreferencesBodySchema as u };
//# sourceMappingURL=profile.mjs.map
