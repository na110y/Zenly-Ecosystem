import { describe, it, expect } from 'vitest'
import { registerBodySchema, verifyEmailBodySchema } from '../../server/identity/dto/register'

describe('registerBodySchema', () => {
  it('accepts a valid payload', () => {
    const result = registerBodySchema.safeParse({
      email: 'a@example.com',
      password: 'password123',
      displayName: 'A',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = registerBodySchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
      displayName: 'A',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = registerBodySchema.safeParse({
      email: 'a@example.com',
      password: 'short',
      displayName: 'A',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an empty displayName', () => {
    const result = registerBodySchema.safeParse({
      email: 'a@example.com',
      password: 'password123',
      displayName: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects unknown fields (strict schema)', () => {
    const result = registerBodySchema.safeParse({
      email: 'a@example.com',
      password: 'password123',
      displayName: 'A',
      isAdmin: true,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a missing field', () => {
    const result = registerBodySchema.safeParse({
      email: 'a@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })
})

describe('verifyEmailBodySchema', () => {
  it('accepts a valid payload', () => {
    const result = verifyEmailBodySchema.safeParse({ token: 'some-token' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty token', () => {
    const result = verifyEmailBodySchema.safeParse({ token: '' })
    expect(result.success).toBe(false)
  })

  it('rejects unknown fields (strict schema)', () => {
    const result = verifyEmailBodySchema.safeParse({ token: 'x', extra: 'y' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing token field', () => {
    const result = verifyEmailBodySchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
