import { g as generateToken, h as hashToken, r as readBody, e as createError, f as getPrismaClient, U as UserRepository, k as defineEventHandler, u as useRuntimeConfig } from '../../../_/nitro.mjs';
import { r as registerBodySchema } from '../../../_/register.mjs';
import { Prisma } from '@prisma/client';
import { h as hashPassword } from '../../../_/password.mjs';
import { R as ResendEmailAdapter } from '../../../_/resend-email-adapter.mjs';
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
import '@prisma/adapter-pg';
import 'node:path';
import 'argon2';
import 'resend';

const UNIQUE_CONSTRAINT_VIOLATION = "P2002";
function isUniqueConstraintViolation(error) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION;
}
const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1e3;
async function registerUser(input, deps) {
  const existing = await deps.userRepository.findByEmail(input.email);
  if (existing) {
    return;
  }
  const passwordHash = await hashPassword(input.password);
  let user;
  try {
    user = await deps.userRepository.createUser({
      email: input.email,
      passwordHash,
      displayName: input.displayName
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return;
    }
    throw error;
  }
  const token = generateToken();
  await deps.userRepository.createEmailVerificationToken({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS)
  });
  try {
    await deps.emailAdapter.send({
      to: user.email,
      subject: "X\xE1c minh email c\u1EE7a b\u1EA1n",
      html: `<p>Nh\u1EA5n v\xE0o link sau \u0111\u1EC3 x\xE1c minh email: <a href="${deps.verifyUrlBase}?token=${token}">X\xE1c minh</a></p>`
    });
  } catch {
  }
}

async function handleRegister(event, config) {
  var _a;
  const raw = await readBody(event);
  const result = registerBodySchema.safeParse(raw);
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid registration payload" });
  }
  const prisma = getPrismaClient(config.databaseUrl);
  const userRepository = new UserRepository(prisma);
  const emailAdapter = new ResendEmailAdapter(config.resendApiKey, config.emailFrom);
  await registerUser(result.data, {
    userRepository,
    emailAdapter,
    verifyUrlBase: `${(_a = config.public.siteUrl) != null ? _a : ""}/account/verify-email`
  });
  return { status: "ok" };
}

const register_post = defineEventHandler((event) => handleRegister(event, useRuntimeConfig(event)));

export { register_post as default };
//# sourceMappingURL=register.post.mjs.map
