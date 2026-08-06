// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { generateToken, hashToken } from '../../server/identity/token'

describe('token generation and hashing', () => {
  it('generates a token with sufficient entropy (256-bit, base64url)', () => {
    const token = generateToken()
    expect(token.length).toBeGreaterThanOrEqual(40)
  })

  it('generates a different token on each call', () => {
    expect(generateToken()).not.toBe(generateToken())
  })

  it('hashToken is deterministic for the same input', () => {
    const token = generateToken()
    expect(hashToken(token)).toBe(hashToken(token))
  })

  it('hashToken output never equals the input token (not reversible storage)', () => {
    const token = generateToken()
    expect(hashToken(token)).not.toBe(token)
  })

  it('hashToken produces different hashes for different tokens', () => {
    expect(hashToken(generateToken())).not.toBe(hashToken(generateToken()))
  })
})
