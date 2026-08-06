import type { UserRepository } from '../repository/user-repository'

export class UserNotFoundError extends Error {}

export interface ProfileDto {
  id: string
  email: string
  displayName: string
  status: string
}

function toProfileDto(user: {
  id: string
  email: string
  displayName: string
  status: string
}): ProfileDto {
  return { id: user.id, email: user.email, displayName: user.displayName, status: user.status }
}

export async function getProfile(
  userId: string,
  deps: { userRepository: UserRepository },
): Promise<ProfileDto> {
  const user = await deps.userRepository.findUserById(userId)
  if (!user) {
    throw new UserNotFoundError()
  }
  return toProfileDto(user)
}

export interface UpdateProfileInput {
  displayName: string
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
  deps: { userRepository: UserRepository },
): Promise<ProfileDto> {
  const user = await deps.userRepository.updateProfile(userId, { displayName: input.displayName })
  return toProfileDto(user)
}
