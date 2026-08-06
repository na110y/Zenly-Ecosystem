import { readBody, createError, type H3Event } from 'h3'
import { resetPasswordBodySchema } from '../dto/password-reset'
import {
  resetPassword,
  InvalidResetTokenError,
  ExpiredResetTokenError,
  AlreadyConsumedResetTokenError,
} from '../use-cases/reset-password'
import { UserRepository } from '../repository/user-repository'
import { getPrismaClient } from '../db'

export interface ResetPasswordHandlerConfig {
  databaseUrl: string
}

export async function handleResetPassword(event: H3Event, config: ResetPasswordHandlerConfig) {
  const raw = await readBody(event)
  const result = resetPasswordBodySchema.safeParse(raw)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const userRepository = new UserRepository(prisma)

  try {
    await resetPassword(result.data, { userRepository })
  } catch (error) {
    if (error instanceof InvalidResetTokenError) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid reset token' })
    }
    if (error instanceof ExpiredResetTokenError) {
      throw createError({ statusCode: 409, statusMessage: 'Reset token expired' })
    }
    if (error instanceof AlreadyConsumedResetTokenError) {
      throw createError({ statusCode: 409, statusMessage: 'Reset token already used' })
    }
    throw error
  }

  return { status: 'ok' }
}
