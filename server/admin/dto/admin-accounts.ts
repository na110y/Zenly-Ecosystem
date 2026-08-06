import { z } from 'zod'

export const createAdminAccountBodySchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['ADMIN', 'SUPER_ADMIN']),
  })
  .strict()

export type CreateAdminAccountBody = z.infer<typeof createAdminAccountBodySchema>

export const updateAdminAccountBodySchema = z
  .object({
    role: z.enum(['ADMIN', 'SUPER_ADMIN']).optional(),
    status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  })
  .strict()
  .refine((body) => body.role !== undefined || body.status !== undefined, {
    message: 'At least one of role or status must be provided',
  })

export type UpdateAdminAccountBody = z.infer<typeof updateAdminAccountBodySchema>
