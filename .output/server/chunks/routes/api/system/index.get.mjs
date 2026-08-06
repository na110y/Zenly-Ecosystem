import { f as getPrismaClient, A as AdminRepository, k as defineEventHandler, u as useRuntimeConfig } from '../../../_/nitro.mjs';
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

async function listAdminAccounts(deps) {
  return deps.adminRepository.listAdminAccounts();
}

async function handleListAdminAccounts(event, config) {
  requireSuperAdmin(event);
  const prisma = getPrismaClient(config.databaseUrl);
  const adminRepository = new AdminRepository(prisma);
  const accounts = await listAdminAccounts({ adminRepository });
  return accounts.map((account) => ({
    id: account.id,
    email: account.email,
    role: account.role,
    status: account.status,
    createdAt: account.createdAt
  }));
}

const index_get = defineEventHandler(
  (event) => handleListAdminAccounts(event, useRuntimeConfig(event))
);

export { index_get as default };
//# sourceMappingURL=index.get.mjs.map
