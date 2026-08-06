import { z } from 'zod'

export const registerBodySchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    displayName: z.string().min(1).max(100),
  })
  .strict()

export type RegisterBody = z.infer<typeof registerBodySchema>

export const verifyEmailBodySchema = z
  .object({
    token: z.string().min(1),
  })
  .strict()

export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>
