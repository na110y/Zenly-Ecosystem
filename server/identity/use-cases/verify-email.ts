import { hashToken } from '../token'
import type { UserRepository } from '../repository/user-repository'

export class InvalidVerificationTokenError extends Error {}
export class ExpiredVerificationTokenError extends Error {}
export class AlreadyConsumedVerificationTokenError extends Error {}

export interface VerifyEmailInput {
  token: string
}

export async function verifyEmail(
  input: VerifyEmailInput,
  deps: { userRepository: UserRepository },
): Promise<void> {
  const tokenHash = hashToken(input.token)
  const record = await deps.userRepository.findEmailVerificationTokenByHash(tokenHash)

  if (!record) {
    throw new InvalidVerificationTokenError()
  }
  if (record.consumedAt) {
    throw new AlreadyConsumedVerificationTokenError()
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new ExpiredVerificationTokenError()
  }

  await deps.userRepository.consumeEmailVerificationTokenAndActivateUser(record.id, record.userId)
}
