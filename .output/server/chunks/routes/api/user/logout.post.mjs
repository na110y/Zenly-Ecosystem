import { h as hashToken, l as getCookie, f as getPrismaClient, U as UserRepository, q as deleteCookie, p as USER_SESSION_COOKIE, k as defineEventHandler, u as useRuntimeConfig } from '../../../_/nitro.mjs';
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

async function logoutUser(token, deps) {
  if (!token) {
    return;
  }
  const session = await deps.userRepository.findUserSessionByTokenHash(hashToken(token));
  if (!session || session.revokedAt) {
    return;
  }
  await deps.userRepository.revokeUserSession(session.id);
}

async function handleLogout(event, config) {
  const token = getCookie(event, USER_SESSION_COOKIE);
  const prisma = getPrismaClient(config.databaseUrl);
  const userRepository = new UserRepository(prisma);
  await logoutUser(token, { userRepository });
  deleteCookie(event, USER_SESSION_COOKIE, { path: "/" });
  return { status: "ok" };
}

const logout_post = defineEventHandler((event) => handleLogout(event, useRuntimeConfig(event)));

export { logout_post as default };
//# sourceMappingURL=logout.post.mjs.map
