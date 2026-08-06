import { k as defineEventHandler, u as useRuntimeConfig } from '../../../_/nitro.mjs';
import { h as handleGetNotificationPreferences } from '../../../_/notification-preferences-handler.mjs';
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
import '../../../_/profile.mjs';

const notificationPreferences_get = defineEventHandler(
  (event) => handleGetNotificationPreferences(event, useRuntimeConfig(event))
);

export { notificationPreferences_get as default };
//# sourceMappingURL=notification-preferences.get.mjs.map
