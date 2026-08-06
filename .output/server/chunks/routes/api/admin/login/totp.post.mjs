import { h as hashToken, l as getCookie, e as createError, r as readBody, f as getPrismaClient, A as AdminRepository, j as ADMIN_SESSION_COOKIE, k as defineEventHandler, u as useRuntimeConfig } from '../../../../_/nitro.mjs';
import { b as adminLoginTotpBodySchema } from '../../../../_/auth.mjs';
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

class AdminSessionNotFoundError extends Error {
}
class TotpAlreadyVerifiedError extends Error {
}
class TotpNotActivatedError extends Error {
}
class InvalidTotpCodeError extends Error {
}
async function verifyAdminLoginTotp(token, code, deps) {
  const session = await deps.adminRepository.findAdminSessionByTokenHash(hashToken(token));
  if (!session) {
    throw new AdminSessionNotFoundError();
  }
  if (session.revokedAt) {
    throw new AdminSessionNotFoundError();
  }
  if (session.expiresAt.getTime() < Date.now()) {
    throw new AdminSessionNotFoundError();
  }
  if (session.totpVerifiedAt) {
    throw new TotpAlreadyVerifiedError();
  }
  const credential = await deps.adminRepository.findTotpCredential(session.adminAccountId);
  if (!credential || !credential.activatedAt) {
    throw new TotpNotActivatedError();
  }
  const secretBase32 = decryptTotpSecret(credential.secretEncrypted, deps.totpEncryptionKey);
  const totp = new TOTP({ secret: Secret.fromBase32(secretBase32) });
  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) {
    throw new InvalidTotpCodeError();
  }
  await deps.adminRepository.markAdminSessionTotpVerified(session.id);
}

async function handleAdminLoginTotp(event, config) {
  const token = getCookie(event, ADMIN_SESSION_COOKIE);
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Admin session required" });
  }
  const raw = await readBody(event);
  const result = adminLoginTotpBodySchema.safeParse(raw);
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid TOTP payload" });
  }
  const prisma = getPrismaClient(config.databaseUrl);
  const adminRepository = new AdminRepository(prisma);
  try {
    await verifyAdminLoginTotp(token, result.data.code, {
      adminRepository,
      totpEncryptionKey: config.totpEncryptionKey
    });
    return { status: "ok" };
  } catch (error) {
    if (error instanceof AdminSessionNotFoundError) {
      throw createError({ statusCode: 401, statusMessage: "Admin session required" });
    }
    if (error instanceof TotpAlreadyVerifiedError) {
      throw createError({ statusCode: 409, statusMessage: "TOTP already verified" });
    }
    if (error instanceof TotpNotActivatedError) {
      throw createError({ statusCode: 409, statusMessage: "TOTP not activated" });
    }
    if (error instanceof InvalidTotpCodeError) {
      throw createError({ statusCode: 401, statusMessage: "Invalid TOTP code" });
    }
    throw error;
  }
}

const totp_post = defineEventHandler((event) => handleAdminLoginTotp(event, useRuntimeConfig(event)));

export { totp_post as default };
//# sourceMappingURL=totp.post.mjs.map
