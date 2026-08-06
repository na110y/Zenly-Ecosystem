import { z } from 'zod';

const forgotPasswordBodySchema = z.object({
  email: z.string().email()
}).strict();
const resetPasswordBodySchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128)
}).strict();

export { forgotPasswordBodySchema as f, resetPasswordBodySchema as r };
//# sourceMappingURL=password-reset.mjs.map
