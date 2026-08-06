import { v as getUserContext, e as createError, f as getPrismaClient, U as UserRepository, r as readBody } from './nitro.mjs';
import { u as updateNotificationPreferencesBodySchema } from './profile.mjs';

const DEFAULT_PREFERENCES = {
  newStoriesEmail: false,
  newChaptersEmail: false,
  webPushEnabled: false
};
async function getNotificationPreferences(userId, deps) {
  const existing = await deps.userRepository.findNotificationPreferences(userId);
  if (!existing) {
    return DEFAULT_PREFERENCES;
  }
  return {
    newStoriesEmail: existing.newStoriesEmail,
    newChaptersEmail: existing.newChaptersEmail,
    webPushEnabled: existing.webPushEnabled
  };
}
async function updateNotificationPreferences(userId, input, deps) {
  const updated = await deps.userRepository.upsertNotificationPreferences(userId, input);
  return {
    newStoriesEmail: updated.newStoriesEmail,
    newChaptersEmail: updated.newChaptersEmail,
    webPushEnabled: updated.webPushEnabled
  };
}

async function handleGetNotificationPreferences(event, config) {
  const context = getUserContext(event);
  if (!context) {
    throw createError({ statusCode: 401, statusMessage: "Authentication required" });
  }
  const prisma = getPrismaClient(config.databaseUrl);
  const userRepository = new UserRepository(prisma);
  return getNotificationPreferences(context.userId, { userRepository });
}
async function handleUpdateNotificationPreferences(event, config) {
  const context = getUserContext(event);
  if (!context) {
    throw createError({ statusCode: 401, statusMessage: "Authentication required" });
  }
  const raw = await readBody(event);
  const result = updateNotificationPreferencesBodySchema.safeParse(raw);
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
  }
  const prisma = getPrismaClient(config.databaseUrl);
  const userRepository = new UserRepository(prisma);
  return updateNotificationPreferences(context.userId, result.data, { userRepository });
}

export { handleUpdateNotificationPreferences as a, handleGetNotificationPreferences as h };
//# sourceMappingURL=notification-preferences-handler.mjs.map
