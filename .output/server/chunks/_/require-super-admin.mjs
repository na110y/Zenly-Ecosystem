import { m as getAdminContext, e as createError } from './nitro.mjs';

function requireVerifiedAdmin(event) {
  const context = getAdminContext(event);
  if (!context) {
    throw createError({ statusCode: 401, statusMessage: "Admin session required" });
  }
  if (!context.totpVerifiedAt) {
    throw createError({ statusCode: 403, statusMessage: "TOTP verification required" });
  }
  return context;
}

function requireSuperAdmin(event) {
  const context = requireVerifiedAdmin(event);
  if (context.role !== "SUPER_ADMIN") {
    throw createError({ statusCode: 403, statusMessage: "SUPER_ADMIN role required" });
  }
  return context;
}

export { requireSuperAdmin as r };
//# sourceMappingURL=require-super-admin.mjs.map
