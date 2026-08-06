import { k as defineEventHandler, v as getUserContext, e as createError } from '../../../_/nitro.mjs';
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

const me_get = defineEventHandler((event) => {
  const context = getUserContext(event);
  if (!context) {
    throw createError({ statusCode: 401, statusMessage: "Authentication required" });
  }
  return { userId: context.userId };
});

export { me_get as default };
//# sourceMappingURL=me.get.mjs.map
