import { r as readBody, e as createError, f as getPrismaClient, A as AdminRepository, k as defineEventHandler, u as useRuntimeConfig } from '../../../_/nitro.mjs';
import { c as createAdminAccountBodySchema } from '../../../_/admin-accounts.mjs';
import { h as hashPassword } from '../../../_/password.mjs';
import { r as requireSuperAdmin } from '../../../_/require-super-admin.mjs';
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

async function createAdminAccount(input, actorAdminAccountId, deps) {
  const passwordHash = await hashPassword(input.password);
  const account = await deps.adminRepository.createAdminAccount({
    email: input.email,
    passwordHash,
    role: input.role
  });
  await deps.adminRepository.createAuditLog({
    adminAccountId: actorAdminAccountId,
    action: "ADMIN_ACCOUNT_CREATE",
    targetType: "AdminAccount",
    targetId: account.id,
    afterValue: { email: account.email, role: account.role, status: account.status }
  });
  return account;
}

async function handleCreateAdminAccount(event, config) {
  const actor = requireSuperAdmin(event);
  const raw = await readBody(event);
  const result = createAdminAccountBodySchema.safeParse(raw);
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid admin account payload" });
  }
  const prisma = getPrismaClient(config.databaseUrl);
  const adminRepository = new AdminRepository(prisma);
  try {
    const account = await createAdminAccount(result.data, actor.adminAccountId, {
      adminRepository
    });
    return { id: account.id, email: account.email, role: account.role, status: account.status };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") {
      throw createError({ statusCode: 409, statusMessage: "Email already in use" });
    }
    throw error;
  }
}

const index_post = defineEventHandler(
  (event) => handleCreateAdminAccount(event, useRuntimeConfig(event))
);

export { index_post as default };
//# sourceMappingURL=index.post.mjs.map
