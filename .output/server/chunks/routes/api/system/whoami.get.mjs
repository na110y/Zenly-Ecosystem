import { k as defineEventHandler } from '../../../_/nitro.mjs';
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

const whoami_get = defineEventHandler((event) => {
  const context = requireSuperAdmin(event);
  return { adminAccountId: context.adminAccountId, role: context.role };
});

export { whoami_get as default };
//# sourceMappingURL=whoami.get.mjs.map
