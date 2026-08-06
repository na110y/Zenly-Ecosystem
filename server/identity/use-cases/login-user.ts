import { verifyPassword } from '../password'
import { generateToken, hashToken } from '../token'
import { sessionExpiryDate } from '../session'
import type { UserRepository } from '../repository/user-repository'

export class InvalidCredentialsError extends Error {}
export class AccountSuspendedError extends Error {}

export interface LoginUserInput {
  email: string
  password: string
}

export interface LoginUserResult {
  token: string
  expiresAt: Date
}

export async function loginUser(
  input: LoginUserInput,
  deps: { userRepository: UserRepository },
): Promise<LoginUserResult> {
  const user = await deps.userRepository.findByEmail(input.email)
  if (!user) {
    throw new InvalidCredentialsError()
  }

  const passwordValid = await verifyPassword(user.passwordHash, input.password)
  if (!passwordValid) {
    throw new InvalidCredentialsError()
  }

  if (user.status === 'SUSPENDED') {
    throw new AccountSuspendedError()
  }

  const token = generateToken()
  const expiresAt = sessionExpiryDate()
  await deps.userRepository.createUserSession({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
  })

  return { token, expiresAt }
}
