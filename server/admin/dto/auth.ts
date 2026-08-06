import { z } from 'zod'

export const adminLoginBodySchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict()

export type AdminLoginBody = z.infer<typeof adminLoginBodySchema>

export const totpActivateBodySchema = z
  .object({
    code: z.string().length(6),
  })
  .strict()

export type TotpActivateBody = z.infer<typeof totpActivateBodySchema>

export const adminLoginTotpBodySchema = z
  .object({
    code: z.string().length(6),
  })
  .strict()

export type AdminLoginTotpBody = z.infer<typeof adminLoginTotpBodySchema>
