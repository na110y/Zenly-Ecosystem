import { h as hashToken, r as readBody, e as createError, f as getPrismaClient, U as UserRepository, k as defineEventHandler, u as useRuntimeConfig } from '../../../../_/nitro.mjs';
import { r as resetPasswordBodySchema } from '../../../../_/password-reset.mjs';
import { h as hashPassword } from '../../../../_/password.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'vue';
import 'consola';
import 'zod';
import 'node:fs';
import 'node:url';
import 'node:crypto';
import 'nuxtseo-shared/utils';
import 'nuxtseo-shared/server';
import 'sitemapd/parse';
import 'ipx';
import '@prisma/client';
import '@prisma/adapter-pg';
import 'node:path';
import 'argon2';

class InvalidResetTokenError extends Error {
}
class ExpiredResetTokenError extends Error {
}
class AlreadyConsumedResetTokenError extends Error {
}
async function resetPassword(input, deps) {
  const tokenHash = hashToken(input.token);
  const record = await deps.userRepository.findPasswordResetTokenByHash(tokenHash);
  if (!record) {
    throw new InvalidResetTokenError();
  }
  if (record.consumedAt) {
    throw new AlreadyConsumedResetTokenError();
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new ExpiredResetTokenError();
  }
  const passwordHash = await hashPassword(input.newPassword);
  await deps.userRepository.resetPasswordAndRevokeSessions({
    tokenId: record.id,
    userId: record.userId,
    passwordHash
  });
}

async function handleResetPassword(event, config) {
  const raw = await readBody(event);
  const result = resetPasswordBodySchema.safeParse(raw);
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
  }
  const prisma = getPrismaClient(config.databaseUrl);
  const userRepository = new UserRepository(prisma);
  try {
    await resetPassword(result.data, { userRepository });
  } catch (error) {
    if (error instanceof InvalidResetTokenError) {
      throw createError({ statusCode: 400, statusMessage: "Invalid reset token" });
    }
    if (error instanceof ExpiredResetTokenError) {
      throw createError({ statusCode: 409, statusMessage: "Reset token expired" });
    }
    if (error instanceof AlreadyConsumedResetTokenError) {
      throw createError({ statusCode: 409, statusMessage: "Reset token already used" });
    }
    throw error;
  }
  return { status: "ok" };
}

const reset_post = defineEventHandler((event) => handleResetPassword(event, useRuntimeConfig(event)));

export { reset_post as default };
//# sourceMappingURL=reset.post.mjs.map
