import { v as getUserContext, e as createError, f as getPrismaClient, U as UserRepository, r as readBody } from './nitro.mjs';
import { a as updateProfileBodySchema } from './profile.mjs';

class UserNotFoundError extends Error {
}
function toProfileDto(user) {
  return { id: user.id, email: user.email, displayName: user.displayName, status: user.status };
}
async function getProfile(userId, deps) {
  const user = await deps.userRepository.findUserById(userId);
  if (!user) {
    throw new UserNotFoundError();
  }
  return toProfileDto(user);
}
async function updateProfile(userId, input, deps) {
  const user = await deps.userRepository.updateProfile(userId, { displayName: input.displayName });
  return toProfileDto(user);
}

async function handleGetProfile(event, config) {
  const context = getUserContext(event);
  if (!context) {
    throw createError({ statusCode: 401, statusMessage: "Authentication required" });
  }
  const prisma = getPrismaClient(config.databaseUrl);
  const userRepository = new UserRepository(prisma);
  return getProfile(context.userId, { userRepository });
}
async function handleUpdateProfile(event, config) {
  const context = getUserContext(event);
  if (!context) {
    throw createError({ statusCode: 401, statusMessage: "Authentication required" });
  }
  const raw = await readBody(event);
  const result = updateProfileBodySchema.safeParse(raw);
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
  }
  const prisma = getPrismaClient(config.databaseUrl);
  const userRepository = new UserRepository(prisma);
  return updateProfile(context.userId, result.data, { userRepository });
}

export { handleUpdateProfile as a, handleGetProfile as h };
//# sourceMappingURL=profile-handler.mjs.map
