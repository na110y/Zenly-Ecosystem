import { hashToken } from '../token'
import { hashPassword } from '../password'
import type { UserRepository } from '../repository/user-repository'

export class InvalidResetTokenError extends Error {}
export class ExpiredResetTokenError extends Error {}
export class AlreadyConsumedResetTokenError extends Error {}

export interface ResetPasswordInput {
  token: string
  newPassword: string
}

export async function resetPassword(
  input: ResetPasswordInput,
  deps: { userRepository: UserRepository },
): Promise<void> {
  const tokenHash = hashToken(input.token)
  const record = await deps.userRepository.findPasswordResetTokenByHash(tokenHash)

  if (!record) {
    throw new InvalidResetTokenError()
  }
  if (record.consumedAt) {
    throw new AlreadyConsumedResetTokenError()
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new ExpiredResetTokenError()
  }

  const passwordHash = await hashPassword(input.newPassword)
  await deps.userRepository.resetPasswordAndRevokeSessions({
    tokenId: record.id,
    userId: record.userId,
    passwordHash,
  })
}
