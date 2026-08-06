import { hashToken } from '../token'
import type { UserRepository } from '../repository/user-repository'

export interface ResolvedSession {
  userId: string
}

export async function resolveSession(
  token: string | undefined,
  deps: { userRepository: UserRepository },
): Promise<ResolvedSession | null> {
  if (!token) {
    return null
  }

  const session = await deps.userRepository.findUserSessionByTokenHash(hashToken(token))
  if (!session) {
    return null
  }
  if (session.revokedAt) {
    return null
  }
  if (session.expiresAt.getTime() < Date.now()) {
    return null
  }

  return { userId: session.userId }
}
