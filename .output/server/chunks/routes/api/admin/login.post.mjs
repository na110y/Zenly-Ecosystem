import { g as generateToken, h as hashToken, c as adminSessionExpiryDate, r as readBody, e as createError, f as getPrismaClient, A as AdminRepository, i as setCookie, j as ADMIN_SESSION_COOKIE, k as defineEventHandler, u as useRuntimeConfig } from '../../../_/nitro.mjs';
import { a as adminLoginBodySchema } from '../../../_/auth.mjs';
import { v as verifyPassword } from '../../../_/password.mjs';
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

class InvalidAdminCredentialsError extends Error {
}
class AdminAccountDisabledError extends Error {
}
async function loginAdmin(input, deps) {
  const admin = await deps.adminRepository.findByEmail(input.email);
  if (!admin) {
    throw new InvalidAdminCredentialsError();
  }
  const passwordValid = await verifyPassword(admin.passwordHash, input.password);
  if (!passwordValid) {
    throw new InvalidAdminCredentialsError();
  }
  if (admin.status === "DISABLED") {
    throw new AdminAccountDisabledError();
  }
  const token = generateToken();
  const expiresAt = adminSessionExpiryDate();
  await deps.adminRepository.createAdminSession({
    adminAccountId: admin.id,
    tokenHash: hashToken(token),
    expiresAt
  });
  return { token, expiresAt };
}

async function handleAdminLogin(event, config) {
  const raw = await readBody(event);
  const result = adminLoginBodySchema.safeParse(raw);
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid login payload" });
  }
  const prisma = getPrismaClient(config.databaseUrl);
  const adminRepository = new AdminRepository(prisma);
  try {
    const { token, expiresAt } = await loginAdmin(result.data, { adminRepository });
    setCookie(event, ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      expires: expiresAt,
      path: "/"
    });
    return { status: "ok" };
  } catch (error) {
    if (error instanceof InvalidAdminCredentialsError) {
      throw createError({ statusCode: 401, statusMessage: "Invalid email or password" });
    }
    if (error instanceof AdminAccountDisabledError) {
      throw createError({ statusCode: 403, statusMessage: "Account disabled" });
    }
    throw error;
  }
}

const login_post = defineEventHandler((event) => handleAdminLogin(event, useRuntimeConfig(event)));

export { login_post as default };
//# sourceMappingURL=login.post.mjs.map
