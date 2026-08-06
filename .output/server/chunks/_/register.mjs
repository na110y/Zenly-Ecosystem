import { z } from 'zod';

const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(100)
}).strict();
const verifyEmailBodySchema = z.object({
  token: z.string().min(1)
}).strict();

export { registerBodySchema as r, verifyEmailBodySchema as v };
//# sourceMappingURL=register.mjs.map
