// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { Prisma } from '@prisma/client'
import { registerUser } from '../../server/identity/use-cases/register-user'
import type { UserRepository } from '../../server/identity/repository/user-repository'
import type { EmailAdapter } from '../../server/identity/adapters/email-adapter'

function fakeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(null),
    createUser: vi.fn().mockResolvedValue({
      id: 'user-1',
      email: 'a@example.com',
      passwordHash: 'hashed',
      displayName: 'A',
      status: 'REGISTERED',
      emailVerifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    createEmailVerificationToken: vi.fn().mockResolvedValue({}),
    findEmailVerificationTokenByHash: vi.fn(),
    consumeEmailVerificationTokenAndActivateUser: vi.fn(),
    ...overrides,
  } as unknown as UserRepository
}

function fakeEmailAdapter(overrides: Partial<EmailAdapter> = {}): EmailAdapter {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('registerUser', () => {
  it('creates a user and sends a verification email on the happy path', async () => {
    const userRepository = fakeUserRepository()
    const emailAdapter = fakeEmailAdapter()

    await registerUser(
      { email: 'a@example.com', password: 'password123', displayName: 'A' },
      { userRepository, emailAdapter, verifyUrlBase: 'https://example.com/verify' },
    )

    expect(userRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@example.com', displayName: 'A' }),
    )
    expect(userRepository.createEmailVerificationToken).toHaveBeenCalledOnce()
    expect(emailAdapter.send).toHaveBeenCalledOnce()
  })

  it('does not store the plaintext password', async () => {
    const userRepository = fakeUserRepository()
    const emailAdapter = fakeEmailAdapter()

    await registerUser(
      { email: 'a@example.com', password: 'super-secret-password', displayName: 'A' },
      { userRepository, emailAdapter, verifyUrlBase: 'https://example.com/verify' },
    )

    const createUserCall = (userRepository.createUser as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(createUserCall.passwordHash).not.toBe('super-secret-password')
    expect(createUserCall.passwordHash).not.toContain('super-secret-password')
  })

  it('does not create a second user or token when the email already exists (no enumeration)', async () => {
    const userRepository = fakeUserRepository({
      findByEmail: vi.fn().mockResolvedValue({ id: 'existing-user' }),
    })
    const emailAdapter = fakeEmailAdapter()

    await registerUser(
      { email: 'existing@example.com', password: 'password123', displayName: 'A' },
      { userRepository, emailAdapter, verifyUrlBase: 'https://example.com/verify' },
    )

    expect(userRepository.createUser).not.toHaveBeenCalled()
    expect(userRepository.createEmailVerificationToken).not.toHaveBeenCalled()
    expect(emailAdapter.send).not.toHaveBeenCalled()
  })

  it('does not throw and does not send an email when createUser hits a unique constraint race (P2002)', async () => {
    const uniqueViolation = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.9.1',
    })
    const userRepository = fakeUserRepository({
      createUser: vi.fn().mockRejectedValue(uniqueViolation),
    })
    const emailAdapter = fakeEmailAdapter()

    await expect(
      registerUser(
        { email: 'racer@example.com', password: 'password123', displayName: 'Racer' },
        { userRepository, emailAdapter, verifyUrlBase: 'https://example.com/verify' },
      ),
    ).resolves.toBeUndefined()

    expect(userRepository.createEmailVerificationToken).not.toHaveBeenCalled()
    expect(emailAdapter.send).not.toHaveBeenCalled()
  })

  it('rethrows a non-unique-constraint error from createUser', async () => {
    const otherError = new Error('connection lost')
    const userRepository = fakeUserRepository({
      createUser: vi.fn().mockRejectedValue(otherError),
    })
    const emailAdapter = fakeEmailAdapter()

    await expect(
      registerUser(
        { email: 'a@example.com', password: 'password123', displayName: 'A' },
        { userRepository, emailAdapter, verifyUrlBase: 'https://example.com/verify' },
      ),
    ).rejects.toThrow('connection lost')
  })

  it('does not throw when the email adapter fails (registration still succeeds)', async () => {
    const userRepository = fakeUserRepository()
    const emailAdapter = fakeEmailAdapter({
      send: vi.fn().mockRejectedValue(new Error('provider timeout')),
    })

    await expect(
      registerUser(
        { email: 'a@example.com', password: 'password123', displayName: 'A' },
        { userRepository, emailAdapter, verifyUrlBase: 'https://example.com/verify' },
      ),
    ).resolves.toBeUndefined()

    expect(userRepository.createUser).toHaveBeenCalledOnce()
  })
})
