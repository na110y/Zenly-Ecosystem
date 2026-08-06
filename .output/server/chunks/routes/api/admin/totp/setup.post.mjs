import { m as getAdminContext, e as createError, f as getPrismaClient, A as AdminRepository, k as defineEventHandler, u as useRuntimeConfig } from '../../../../_/nitro.mjs';
import { Secret, TOTP } from 'otpauth';
import { toDataURL } from 'qrcode';
import { e as encryptTotpSecret } from '../../../../_/totp-encryption.mjs';
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

class TotpAlreadyActivatedError extends Error {
}
async function setupTotp(adminAccountId, deps) {
  const existing = await deps.adminRepository.findTotpCredential(adminAccountId);
  if (existing == null ? void 0 : existing.activatedAt) {
    throw new TotpAlreadyActivatedError();
  }
  const secret = new Secret();
  const totp = new TOTP({
    issuer: deps.issuer,
    label: deps.accountLabel,
    secret
  });
  const secretEncrypted = encryptTotpSecret(secret.base32, deps.totpEncryptionKey);
  await deps.adminRepository.upsertTotpCredential({ adminAccountId, secretEncrypted });
  const qrCodeDataUrl = await toDataURL(totp.toString());
  return { qrCodeDataUrl };
}

async function handleAdminTotpSetup(event, config) {
  const adminContext = getAdminContext(event);
  if (!adminContext) {
    throw createError({ statusCode: 401, statusMessage: "Admin session required" });
  }
  const prisma = getPrismaClient(config.databaseUrl);
  const adminRepository = new AdminRepository(prisma);
  const admin = await adminRepository.findById(adminContext.adminAccountId);
  if (!admin) {
    throw createError({ statusCode: 401, statusMessage: "Admin session required" });
  }
  try {
    const result = await setupTotp(adminContext.adminAccountId, {
      adminRepository,
      totpEncryptionKey: config.totpEncryptionKey,
      issuer: config.issuer,
      accountLabel: admin.email
    });
    return result;
  } catch (error) {
    if (error instanceof TotpAlreadyActivatedError) {
      throw createError({ statusCode: 409, statusMessage: "TOTP already activated" });
    }
    throw error;
  }
}

const setup_post = defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  return handleAdminTotpSetup(event, {
    databaseUrl: config.databaseUrl,
    totpEncryptionKey: config.totpEncryptionKey,
    issuer: "Zenly Stories"
  });
});

export { setup_post as default };
//# sourceMappingURL=setup.post.mjs.map
