import { h as hashToken, r as readBody, e as createError, f as getPrismaClient, U as UserRepository, k as defineEventHandler, u as useRuntimeConfig } from '../../../../_/nitro.mjs';
import { v as verifyEmailBodySchema } from '../../../../_/register.mjs';
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

class InvalidVerificationTokenError extends Error {
}
class ExpiredVerificationTokenError extends Error {
}
class AlreadyConsumedVerificationTokenError extends Error {
}
async function verifyEmail(input, deps) {
  const tokenHash = hashToken(input.token);
  const record = await deps.userRepository.findEmailVerificationTokenByHash(tokenHash);
  if (!record) {
    throw new InvalidVerificationTokenError();
  }
  if (record.consumedAt) {
    throw new AlreadyConsumedVerificationTokenError();
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new ExpiredVerificationTokenError();
  }
  await deps.userRepository.consumeEmailVerificationTokenAndActivateUser(record.id, record.userId);
}

async function handleVerifyEmail(event, config) {
  const raw = await readBody(event);
  const result = verifyEmailBodySchema.safeParse(raw);
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid verification payload" });
  }
  const prisma = getPrismaClient(config.databaseUrl);
  const userRepository = new UserRepository(prisma);
  try {
    await verifyEmail(result.data, { userRepository });
  } catch (error) {
    if (error instanceof InvalidVerificationTokenError) {
      throw createError({ statusCode: 400, statusMessage: "Invalid verification token" });
    }
    if (error instanceof ExpiredVerificationTokenError) {
      throw createError({ statusCode: 409, statusMessage: "Verification token expired" });
    }
    if (error instanceof AlreadyConsumedVerificationTokenError) {
      throw createError({ statusCode: 409, statusMessage: "Verification token already used" });
    }
    throw error;
  }
  return { status: "ok" };
}

const verifyEmail_post = defineEventHandler((event) => handleVerifyEmail(event, useRuntimeConfig(event)));

export { verifyEmail_post as default };
//# sourceMappingURL=verify-email.post.mjs.map
