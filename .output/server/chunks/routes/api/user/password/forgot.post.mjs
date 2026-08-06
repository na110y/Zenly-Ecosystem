import { g as generateToken, h as hashToken, r as readBody, e as createError, f as getPrismaClient, U as UserRepository, k as defineEventHandler, u as useRuntimeConfig } from '../../../../_/nitro.mjs';
import { f as forgotPasswordBodySchema } from '../../../../_/password-reset.mjs';
import { R as ResendEmailAdapter } from '../../../../_/resend-email-adapter.mjs';
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
import 'resend';

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1e3;
async function requestPasswordReset(input, deps) {
  const user = await deps.userRepository.findByEmail(input.email);
  if (!user) {
    return;
  }
  const token = generateToken();
  await deps.userRepository.createPasswordResetToken({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS)
  });
  try {
    await deps.emailAdapter.send({
      to: user.email,
      subject: "\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u",
      html: `<p>Nh\u1EA5n v\xE0o link sau \u0111\u1EC3 \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u: <a href="${deps.resetUrlBase}?token=${token}">\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u</a></p>`
    });
  } catch {
  }
}

async function handleForgotPassword(event, config) {
  var _a;
  const raw = await readBody(event);
  const result = forgotPasswordBodySchema.safeParse(raw);
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid payload" });
  }
  const prisma = getPrismaClient(config.databaseUrl);
  const userRepository = new UserRepository(prisma);
  const emailAdapter = new ResendEmailAdapter(config.resendApiKey, config.emailFrom);
  await requestPasswordReset(result.data, {
    userRepository,
    emailAdapter,
    resetUrlBase: `${(_a = config.public.siteUrl) != null ? _a : ""}/account/password/reset`
  });
  return { status: "ok" };
}

const forgot_post = defineEventHandler((event) => handleForgotPassword(event, useRuntimeConfig(event)));

export { forgot_post as default };
//# sourceMappingURL=forgot.post.mjs.map
