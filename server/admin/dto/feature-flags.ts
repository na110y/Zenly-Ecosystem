import { z } from 'zod'

export const updateFeatureFlagBodySchema = z
  .object({
    enabled: z.boolean(),
    expectedVersion: z.number().int().positive(),
  })
  .strict()

export type UpdateFeatureFlagBody = z.infer<typeof updateFeatureFlagBodySchema>
