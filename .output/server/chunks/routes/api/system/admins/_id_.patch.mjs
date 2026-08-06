import { n as getRouterParam, e as createError, r as readBody, f as getPrismaClient, A as AdminRepository, L as LastActiveSuperAdminError, k as defineEventHandler, u as useRuntimeConfig } from '../../../../_/nitro.mjs';
import { u as updateAdminAccountBodySchema } from '../../../../_/admin-accounts.mjs';
import { r as requireSuperAdmin } from '../../../../_/require-super-admin.mjs';
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

class AdminAccountNotFoundError extends Error {
}
async function updateAdminAccount(targetAdminAccountId, input, actorAdminAccountId, deps) {
  var _a;
  const target = await deps.adminRepository.findById(targetAdminAccountId);
  if (!target) {
    throw new AdminAccountNotFoundError();
  }
  const beforeValue = {};
  const afterValue = {};
  if (input.role !== void 0 && input.role !== target.role) {
    await deps.adminRepository.updateAdminAccountRole(targetAdminAccountId, target.role, input.role);
    beforeValue.role = target.role;
    afterValue.role = input.role;
  }
  if (input.status !== void 0 && input.status !== target.status) {
    if (input.status === "DISABLED") {
      const roleAfterUpdate = (_a = input.role) != null ? _a : target.role;
      await deps.adminRepository.disableAdminAccount(targetAdminAccountId, roleAfterUpdate);
    } else {
      await deps.adminRepository.enableAdminAccount(targetAdminAccountId);
    }
    beforeValue.status = target.status;
    afterValue.status = input.status;
  }
  if (Object.keys(afterValue).length === 0) {
    return;
  }
  await deps.adminRepository.createAuditLog({
    adminAccountId: actorAdminAccountId,
    action: "ADMIN_ACCOUNT_UPDATE",
    targetType: "AdminAccount",
    targetId: targetAdminAccountId,
    beforeValue,
    afterValue
  });
}

async function handleUpdateAdminAccount(event, config) {
  const actor = requireSuperAdmin(event);
  const targetId = getRouterParam(event, "id");
  if (!targetId) {
    throw createError({ statusCode: 400, statusMessage: "Missing admin account id" });
  }
  const raw = await readBody(event);
  const result = updateAdminAccountBodySchema.safeParse(raw);
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid admin account update payload" });
  }
  const prisma = getPrismaClient(config.databaseUrl);
  const adminRepository = new AdminRepository(prisma);
  try {
    await updateAdminAccount(targetId, result.data, actor.adminAccountId, { adminRepository });
    return { status: "ok" };
  } catch (error) {
    if (error instanceof AdminAccountNotFoundError) {
      throw createError({ statusCode: 404, statusMessage: "Admin account not found" });
    }
    if (error instanceof LastActiveSuperAdminError) {
      throw createError({
        statusCode: 409,
        statusMessage: "Cannot demote or disable the last active SUPER_ADMIN"
      });
    }
    throw error;
  }
}

const _id__patch = defineEventHandler(
  (event) => handleUpdateAdminAccount(event, useRuntimeConfig(event))
);

export { _id__patch as default };
//# sourceMappingURL=_id_.patch.mjs.map
