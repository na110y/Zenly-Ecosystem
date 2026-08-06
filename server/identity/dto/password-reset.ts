import { z } from 'zod'

export const forgotPasswordBodySchema = z
  .object({
    email: z.string().email(),
  })
  .strict()

export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>

export const resetPasswordBodySchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  })
  .strict()

export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>
