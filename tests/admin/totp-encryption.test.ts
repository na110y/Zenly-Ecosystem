// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { encryptTotpSecret, decryptTotpSecret } from '../../server/admin/totp-encryption'

describe('TOTP secret encryption', () => {
  const key = 'test-encryption-key-32-bytes-min'

  it('round-trips a secret through encrypt then decrypt', () => {
    const secret = 'JBSWY3DPEHPK3PXP'
    const encrypted = encryptTotpSecret(secret, key)
    expect(encrypted).not.toBe(secret)
    expect(decryptTotpSecret(encrypted, key)).toBe(secret)
  })

  it('produces a different ciphertext each time due to a random IV', () => {
    const secret = 'JBSWY3DPEHPK3PXP'
    const first = encryptTotpSecret(secret, key)
    const second = encryptTotpSecret(secret, key)
    expect(first).not.toBe(second)
  })

  it('fails to decrypt with the wrong key', () => {
    const secret = 'JBSWY3DPEHPK3PXP'
    const encrypted = encryptTotpSecret(secret, key)
    expect(() => decryptTotpSecret(encrypted, 'wrong-key-also-32-bytes-min-len')).toThrow()
  })

  it('throws on a malformed payload', () => {
    expect(() => decryptTotpSecret('not-a-valid-payload', key)).toThrow(
      'Malformed encrypted TOTP secret payload',
    )
  })
})
