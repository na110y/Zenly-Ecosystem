import { describe, it, expect } from 'vitest'
import { validateEnv, EnvValidationError } from '../../server/env/validate'

const VALID_DEV_ENV = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://zenly:change_me@localhost:5432/zenly',
  NUXT_SESSION_SECRET: 'dev_session_secret_at_least_32_bytes_long',
  NUXT_DATA_ENCRYPTION_KEY: 'dev_encryption_key_32_bytes_long!',
  NUXT_VISITOR_HMAC_KEY: 'dev_visitor_hmac_key_32_bytes_long!',
  NUXT_TOTP_ENCRYPTION_KEY: 'dev_totp_key_32_bytes_long_______',
} satisfies NodeJS.ProcessEnv

const REQUIRED_SECRET_KEYS = [
  'NUXT_SESSION_SECRET',
  'NUXT_DATA_ENCRYPTION_KEY',
  'NUXT_VISITOR_HMAC_KEY',
  'NUXT_TOTP_ENCRYPTION_KEY',
] as const

describe('validateEnv', () => {
  it('accepts a fully valid development env', () => {
    const result = validateEnv(VALID_DEV_ENV)
    expect(result.NODE_ENV).toBe('development')
    expect(result.DATABASE_URL).toBe(VALID_DEV_ENV.DATABASE_URL)
  })

  it('rejects when DATABASE_URL is missing', () => {
    const { DATABASE_URL: _omit, ...rest } = VALID_DEV_ENV
    expect(() => validateEnv(rest as NodeJS.ProcessEnv)).toThrow(EnvValidationError)
  })

  it.each(REQUIRED_SECRET_KEYS)('rejects when %s is missing', (key) => {
    const rest: Record<string, string | undefined> = { ...VALID_DEV_ENV }
    rest[key] = undefined
    expect(() => validateEnv(rest as NodeJS.ProcessEnv)).toThrow(EnvValidationError)
  })

  it.each(REQUIRED_SECRET_KEYS)('rejects when %s is shorter than 32 bytes', (key) => {
    const rest = { ...VALID_DEV_ENV, [key]: 'too_short' }
    expect(() => validateEnv(rest as NodeJS.ProcessEnv)).toThrow(EnvValidationError)
  })

  it('accepts dev_* placeholder secrets in development', () => {
    expect(() => validateEnv(VALID_DEV_ENV)).not.toThrow()
  })

  it('accepts change_me DATABASE_URL in development', () => {
    expect(() => validateEnv(VALID_DEV_ENV)).not.toThrow()
  })

  it.each(REQUIRED_SECRET_KEYS)('rejects dev_* placeholder for %s in production', (key) => {
    const prodEnv = {
      ...VALID_DEV_ENV,
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://zenly:S7f2!kQxLp9@db.example.com:5432/zenly',
      NUXT_SESSION_SECRET: 'a'.repeat(32),
      NUXT_DATA_ENCRYPTION_KEY: 'a'.repeat(32),
      NUXT_VISITOR_HMAC_KEY: 'a'.repeat(32),
      NUXT_TOTP_ENCRYPTION_KEY: 'a'.repeat(32),
      [key]: VALID_DEV_ENV[key],
    }
    expect(() => validateEnv(prodEnv as NodeJS.ProcessEnv)).toThrow(EnvValidationError)
  })

  it('rejects change_me DATABASE_URL in production', () => {
    const prodEnv = {
      ...VALID_DEV_ENV,
      NODE_ENV: 'production',
      NUXT_SESSION_SECRET: 'a'.repeat(32),
      NUXT_DATA_ENCRYPTION_KEY: 'a'.repeat(32),
      NUXT_VISITOR_HMAC_KEY: 'a'.repeat(32),
      NUXT_TOTP_ENCRYPTION_KEY: 'a'.repeat(32),
    }
    expect(() => validateEnv(prodEnv as NodeJS.ProcessEnv)).toThrow(EnvValidationError)
  })

  it('accepts fully non-placeholder secrets in production', () => {
    const prodEnv = {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://zenly:S7f2!kQxLp9@db.example.com:5432/zenly',
      NUXT_SESSION_SECRET: 'a'.repeat(32),
      NUXT_DATA_ENCRYPTION_KEY: 'b'.repeat(32),
      NUXT_VISITOR_HMAC_KEY: 'c'.repeat(32),
      NUXT_TOTP_ENCRYPTION_KEY: 'd'.repeat(32),
    }
    expect(() => validateEnv(prodEnv as NodeJS.ProcessEnv)).not.toThrow()
  })

  it('never includes secret values in the thrown error message', () => {
    const rest = { ...VALID_DEV_ENV, NUXT_SESSION_SECRET: 'too_short_secret_value' }
    try {
      validateEnv(rest as NodeJS.ProcessEnv)
      expect.fail('expected validateEnv to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError)
      const message = (error as EnvValidationError).message
      expect(message).not.toContain('too_short_secret_value')
    }
  })
})
