import { hashToken } from '../token'
import type { UserRepository } from '../repository/user-repository'

export async function logoutUser(
  token: string | undefined,
  deps: { userRepository: UserRepository },
): Promise<void> {
  if (!token) {
    return
  }

  const session = await deps.userRepository.findUserSessionByTokenHash(hashToken(token))
  if (!session || session.revokedAt) {
    return
  }

  await deps.userRepository.revokeUserSession(session.id)
}
