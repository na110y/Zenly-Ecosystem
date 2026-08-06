import type { PrismaClient, User, UserNotificationPreference } from '@prisma/client'

export interface CreateUserInput {
  email: string
  passwordHash: string
  displayName: string
}

export interface CreateEmailVerificationTokenInput {
  userId: string
  tokenHash: string
  expiresAt: Date
}

export interface CreateUserSessionInput {
  userId: string
  tokenHash: string
  expiresAt: Date
  userAgent?: string
  ipHash?: string
}

export interface CreatePasswordResetTokenInput {
  userId: string
  tokenHash: string
  expiresAt: Date
}

export interface UpdateProfileInput {
  displayName: string
}

export interface NotificationPreferencesInput {
  newStoriesEmail: boolean
  newChaptersEmail: boolean
  webPushEnabled: boolean
}

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }

  createUser(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({ data: input })
  }

  createEmailVerificationToken(input: CreateEmailVerificationTokenInput) {
    return this.prisma.emailVerificationToken.create({ data: input })
  }

  findEmailVerificationTokenByHash(tokenHash: string) {
    return this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } })
  }

  async consumeEmailVerificationTokenAndActivateUser(
    tokenId: string,
    userId: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: tokenId },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'EMAIL_VERIFIED', emailVerifiedAt: new Date() },
      }),
    ])
  }

  createUserSession(input: CreateUserSessionInput) {
    return this.prisma.userSession.create({ data: input })
  }

  findUserSessionByTokenHash(tokenHash: string) {
    return this.prisma.userSession.findUnique({ where: { tokenHash } })
  }

  async revokeUserSession(sessionId: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    })
  }

  findUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } })
  }

  createPasswordResetToken(input: CreatePasswordResetTokenInput) {
    return this.prisma.passwordResetToken.create({ data: input })
  }

  findPasswordResetTokenByHash(tokenHash: string) {
    return this.prisma.passwordResetToken.findUnique({ where: { tokenHash } })
  }

  async resetPasswordAndRevokeSessions(input: {
    tokenId: string
    userId: string
    passwordHash: string
  }): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: input.tokenId },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: input.userId },
        data: { passwordHash: input.passwordHash },
      }),
      this.prisma.userSession.updateMany({
        where: { userId: input.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ])
  }

  updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
    return this.prisma.user.update({ where: { id: userId }, data: input })
  }

  findNotificationPreferences(userId: string): Promise<UserNotificationPreference | null> {
    return this.prisma.userNotificationPreference.findUnique({ where: { userId } })
  }

  upsertNotificationPreferences(
    userId: string,
    input: NotificationPreferencesInput,
  ): Promise<UserNotificationPreference> {
    return this.prisma.userNotificationPreference.upsert({
      where: { userId },
      create: { userId, ...input },
      update: input,
    })
  }
}
