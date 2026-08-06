import { m as getAdminContext, e as createError, r as readBody, f as getPrismaClient, A as AdminRepository, k as defineEventHandler, u as useRuntimeConfig } from '../../../../_/nitro.mjs';
import { t as totpActivateBodySchema } from '../../../../_/auth.mjs';
import { TOTP, Secret } from 'otpauth';
import { d as decryptTotpSecret } from '../../../../_/totp-encryption.mjs';
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

class TotpNotSetUpError extends Error {
}
class TotpAlreadyActivatedError extends Error {
}
class InvalidTotpCodeError extends Error {
}
async function activateTotp(adminAccountId, code, deps) {
  const credential = await deps.adminRepository.findTotpCredential(adminAccountId);
  if (!credential) {
    throw new TotpNotSetUpError();
  }
  if (credential.activatedAt) {
    throw new TotpAlreadyActivatedError();
  }
  const secretBase32 = decryptTotpSecret(credential.secretEncrypted, deps.totpEncryptionKey);
  const totp = new TOTP({ secret: Secret.fromBase32(secretBase32) });
  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) {
    throw new InvalidTotpCodeError();
  }
  await deps.adminRepository.activateTotpCredential(credential.id);
}

async function handleAdminTotpActivate(event, config) {
  const adminContext = getAdminContext(event);
  if (!adminContext) {
    throw createError({ statusCode: 401, statusMessage: "Admin session required" });
  }
  const raw = await readBody(event);
  const result = totpActivateBodySchema.safeParse(raw);
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid activation payload" });
  }
  const prisma = getPrismaClient(config.databaseUrl);
  const adminRepository = new AdminRepository(prisma);
  try {
    await activateTotp(adminContext.adminAccountId, result.data.code, {
      adminRepository,
      totpEncryptionKey: config.totpEncryptionKey
    });
    return { status: "ok" };
  } catch (error) {
    if (error instanceof TotpNotSetUpError) {
      throw createError({ statusCode: 409, statusMessage: "TOTP not set up" });
    }
    if (error instanceof TotpAlreadyActivatedError) {
      throw createError({ statusCode: 409, statusMessage: "TOTP already activated" });
    }
    if (error instanceof InvalidTotpCodeError) {
      throw createError({ statusCode: 401, statusMessage: "Invalid TOTP code" });
    }
    throw error;
  }
}

const activate_post = defineEventHandler(
  (event) => handleAdminTotpActivate(event, useRuntimeConfig(event))
);

export { activate_post as default };
//# sourceMappingURL=activate.post.mjs.map
