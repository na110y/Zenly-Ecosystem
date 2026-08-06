import { z } from 'zod';

const adminLoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
}).strict();
const totpActivateBodySchema = z.object({
  code: z.string().length(6)
}).strict();
const adminLoginTotpBodySchema = z.object({
  code: z.string().length(6)
}).strict();

export { adminLoginBodySchema as a, adminLoginTotpBodySchema as b, totpActivateBodySchema as t };
//# sourceMappingURL=auth.mjs.map
