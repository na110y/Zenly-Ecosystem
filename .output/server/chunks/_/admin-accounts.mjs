import { z } from 'zod';

const createAdminAccountBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "SUPER_ADMIN"])
}).strict();
const updateAdminAccountBodySchema = z.object({
  role: z.enum(["ADMIN", "SUPER_ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional()
}).strict().refine((body) => body.role !== void 0 || body.status !== void 0, {
  message: "At least one of role or status must be provided"
});

export { createAdminAccountBodySchema as c, updateAdminAccountBodySchema as u };
//# sourceMappingURL=admin-accounts.mjs.map
