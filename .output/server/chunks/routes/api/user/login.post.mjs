import { g as generateToken, h as hashToken, o as sessionExpiryDate, r as readBody, e as createError, f as getPrismaClient, U as UserRepository, i as setCookie, p as USER_SESSION_COOKIE, k as defineEventHandler, u as useRuntimeConfig } from '../../../_/nitro.mjs';
import { z } from 'zod';
import { v as verifyPassword } from '../../../_/password.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'vue';
import 'consola';
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

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
}).strict();

class InvalidCredentialsError extends Error {
}
class AccountSuspendedError extends Error {
}
async function loginUser(input, deps) {
  const user = await deps.userRepository.findByEmail(input.email);
  if (!user) {
    throw new InvalidCredentialsError();
  }
  const passwordValid = await verifyPassword(user.passwordHash, input.password);
  if (!passwordValid) {
    throw new InvalidCredentialsError();
  }
  if (user.status === "SUSPENDED") {
    throw new AccountSuspendedError();
  }
  const token = generateToken();
  const expiresAt = sessionExpiryDate();
  await deps.userRepository.createUserSession({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt
  });
  return { token, expiresAt };
}

async function handleLogin(event, config) {
  const raw = await readBody(event);
  const result = loginBodySchema.safeParse(raw);
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid login payload" });
  }
  const prisma = getPrismaClient(config.databaseUrl);
  const userRepository = new UserRepository(prisma);
  try {
    const { token, expiresAt } = await loginUser(result.data, { userRepository });
    setCookie(event, USER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      expires: expiresAt,
      path: "/"
    });
    return { status: "ok" };
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      throw createError({ statusCode: 401, statusMessage: "Invalid email or password" });
    }
    if (error instanceof AccountSuspendedError) {
      throw createError({ statusCode: 403, statusMessage: "Account suspended" });
    }
    throw error;
  }
}

const login_post = defineEventHandler((event) => handleLogin(event, useRuntimeConfig(event)));

export { login_post as default };
//# sourceMappingURL=login.post.mjs.map
