import { z } from 'zod'

const MIN_SECRET_BYTES = 32

const DEV_PLACEHOLDER_PATTERN = /^(change_me|dev_|replace_with_)/i

function secret(name: string) {
  return z
    .string({ error: `${name} is required` })
    .min(MIN_SECRET_BYTES, `${name} must be at least ${MIN_SECRET_BYTES} bytes`)
}

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z
      .string({ error: 'DATABASE_URL is required' })
      .min(1, 'DATABASE_URL is required'),
    NUXT_SESSION_SECRET: secret('NUXT_SESSION_SECRET'),
    NUXT_DATA_ENCRYPTION_KEY: secret('NUXT_DATA_ENCRYPTION_KEY'),
    NUXT_VISITOR_HMAC_KEY: secret('NUXT_VISITOR_HMAC_KEY'),
    NUXT_TOTP_ENCRYPTION_KEY: secret('NUXT_TOTP_ENCRYPTION_KEY'),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production') return

    const secretFields = [
      'NUXT_SESSION_SECRET',
      'NUXT_DATA_ENCRYPTION_KEY',
      'NUXT_VISITOR_HMAC_KEY',
      'NUXT_TOTP_ENCRYPTION_KEY',
    ] as const

    for (const field of secretFields) {
      if (DEV_PLACEHOLDER_PATTERN.test(value[field])) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: `${field} must not use a development placeholder value in production`,
        })
      }
    }

    if (/change_me/i.test(value.DATABASE_URL)) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL must not use a development placeholder value in production',
      })
    }
  })

export type Env = z.infer<typeof envSchema>
