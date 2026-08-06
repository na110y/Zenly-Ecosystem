// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { requestPasswordReset } from '../../server/identity/use-cases/request-password-reset'
import type { UserRepository } from '../../server/identity/repository/user-repository'
import type { EmailAdapter } from '../../server/identity/adapters/email-adapter'

function fakeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(null),
    createPasswordResetToken: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as UserRepository
}

function fakeEmailAdapter(overrides: Partial<EmailAdapter> = {}): EmailAdapter {
  return { send: vi.fn().mockResolvedValue(undefined), ...overrides }
}

describe('requestPasswordReset', () => {
  it('creates a token and sends an email when the user exists', async () => {
    const userRepository = fakeUserRepository({
      findByEmail: vi.fn().mockResolvedValue({ id: 'user-1', email: 'a@example.com' }),
    })
    const emailAdapter = fakeEmailAdapter()

    await requestPasswordReset(
      { email: 'a@example.com' },
      { userRepository, emailAdapter, resetUrlBase: 'https://x/reset' },
    )

    expect(userRepository.createPasswordResetToken).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
    )
    expect(emailAdapter.send).toHaveBeenCalledOnce()
  })

  it('does nothing when the email does not exist (no enumeration)', async () => {
    const userRepository = fakeUserRepository({ findByEmail: vi.fn().mockResolvedValue(null) })
    const emailAdapter = fakeEmailAdapter()

    await expect(
      requestPasswordReset(
        { email: 'nobody@example.com' },
        { userRepository, emailAdapter, resetUrlBase: 'https://x/reset' },
      ),
    ).resolves.toBeUndefined()

    expect(userRepository.createPasswordResetToken).not.toHaveBeenCalled()
    expect(emailAdapter.send).not.toHaveBeenCalled()
  })

  it('does not throw when the email adapter fails', async () => {
    const userRepository = fakeUserRepository({
      findByEmail: vi.fn().mockResolvedValue({ id: 'user-1', email: 'a@example.com' }),
    })
    const emailAdapter = fakeEmailAdapter({ send: vi.fn().mockRejectedValue(new Error('timeout')) })

    await expect(
      requestPasswordReset(
        { email: 'a@example.com' },
        { userRepository, emailAdapter, resetUrlBase: 'https://x/reset' },
      ),
    ).resolves.toBeUndefined()
  })
})
