import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { bootstrapEnv } from '../../server/env/bootstrap'

describe('bootstrapEnv', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.NODE_ENV = 'development'
    process.env.DATABASE_URL = 'postgresql://zenly:change_me@localhost:5432/zenly'
    process.env.NUXT_SESSION_SECRET = 'dev_session_secret_at_least_32_bytes_long'
    process.env.NUXT_DATA_ENCRYPTION_KEY = 'dev_encryption_key_32_bytes_long!'
    process.env.NUXT_VISITOR_HMAC_KEY = 'dev_visitor_hmac_key_32_bytes_long!'
    process.env.NUXT_TOTP_ENCRYPTION_KEY = 'dev_totp_key_32_bytes_long_______'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('does not throw when the real process.env is valid', () => {
    expect(() => bootstrapEnv()).not.toThrow()
  })

  it('throws and logs the error message (without secret values) when process.env is invalid', () => {
    delete process.env.NUXT_SESSION_SECRET
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => bootstrapEnv()).toThrow('NUXT_SESSION_SECRET')
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0][0]).toContain('NUXT_SESSION_SECRET')
  })
})
