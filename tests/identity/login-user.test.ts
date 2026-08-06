// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { hashPassword } from '../../server/identity/password'
import {
  loginUser,
  InvalidCredentialsError,
  AccountSuspendedError,
} from '../../server/identity/use-cases/login-user'
import type { UserRepository } from '../../server/identity/repository/user-repository'

function fakeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(null),
    createUserSession: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as UserRepository
}

describe('loginUser', () => {
  it('creates a session and returns a token on the happy path', async () => {
    const passwordHash = await hashPassword('password123')
    const userRepository = fakeUserRepository({
      findByEmail: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
        passwordHash,
        status: 'ACTIVE',
      }),
    })

    const result = await loginUser(
      { email: 'a@example.com', password: 'password123' },
      { userRepository },
    )

    expect(result.token).toBeDefined()
    expect(result.expiresAt).toBeInstanceOf(Date)
    expect(userRepository.createUserSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
    )
  })

  it('stores only the token hash, never the plaintext token', async () => {
    const passwordHash = await hashPassword('password123')
    const userRepository = fakeUserRepository({
      findByEmail: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
        passwordHash,
        status: 'ACTIVE',
      }),
    })

    const result = await loginUser(
      { email: 'a@example.com', password: 'password123' },
      { userRepository },
    )
    const createCall = (userRepository.createUserSession as ReturnType<typeof vi.fn>).mock
      .calls[0][0]

    expect(createCall.tokenHash).not.toBe(result.token)
  })

  it('throws InvalidCredentialsError when the email does not exist', async () => {
    const userRepository = fakeUserRepository({ findByEmail: vi.fn().mockResolvedValue(null) })

    await expect(
      loginUser({ email: 'nobody@example.com', password: 'password123' }, { userRepository }),
    ).rejects.toThrow(InvalidCredentialsError)
    expect(userRepository.createUserSession).not.toHaveBeenCalled()
  })

  it('throws InvalidCredentialsError when the password is wrong', async () => {
    const passwordHash = await hashPassword('correct-password')
    const userRepository = fakeUserRepository({
      findByEmail: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
        passwordHash,
        status: 'ACTIVE',
      }),
    })

    await expect(
      loginUser({ email: 'a@example.com', password: 'wrong-password' }, { userRepository }),
    ).rejects.toThrow(InvalidCredentialsError)
    expect(userRepository.createUserSession).not.toHaveBeenCalled()
  })

  it('allows login for a REGISTERED (unverified) user', async () => {
    const passwordHash = await hashPassword('password123')
    const userRepository = fakeUserRepository({
      findByEmail: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
        passwordHash,
        status: 'REGISTERED',
      }),
    })

    await expect(
      loginUser({ email: 'a@example.com', password: 'password123' }, { userRepository }),
    ).resolves.toBeDefined()
  })

  it('throws AccountSuspendedError for a SUSPENDED user, without creating a session', async () => {
    const passwordHash = await hashPassword('password123')
    const userRepository = fakeUserRepository({
      findByEmail: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
        passwordHash,
        status: 'SUSPENDED',
      }),
    })

    await expect(
      loginUser({ email: 'a@example.com', password: 'password123' }, { userRepository }),
    ).rejects.toThrow(AccountSuspendedError)
    expect(userRepository.createUserSession).not.toHaveBeenCalled()
  })
})
