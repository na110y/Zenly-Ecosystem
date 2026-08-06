// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../../server/identity/password'

describe('password hashing (argon2id)', () => {
  it('hashes a password to a value different from the plaintext', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash).not.toBe('correct horse battery staple')
    expect(hash).toContain('argon2id')
  })

  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('correct horse battery staple')
    await expect(verifyPassword(hash, 'correct horse battery staple')).resolves.toBe(true)
  })

  it('rejects an incorrect password against a hash', async () => {
    const hash = await hashPassword('correct horse battery staple')
    await expect(verifyPassword(hash, 'wrong password')).resolves.toBe(false)
  })

  it('produces a different hash each time due to random salt', async () => {
    const hash1 = await hashPassword('same password')
    const hash2 = await hashPassword('same password')
    expect(hash1).not.toBe(hash2)
  })
})
