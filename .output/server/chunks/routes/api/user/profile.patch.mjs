import { k as defineEventHandler, u as useRuntimeConfig } from '../../../_/nitro.mjs';
import { a as handleUpdateProfile } from '../../../_/profile-handler.mjs';
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

const profile_patch = defineEventHandler((event) => handleUpdateProfile(event, useRuntimeConfig(event)));

export { profile_patch as default };
//# sourceMappingURL=profile.patch.mjs.map
