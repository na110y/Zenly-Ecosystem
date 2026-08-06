import { readBody, createError, type H3Event } from 'h3'
import { verifyEmailBodySchema } from '../dto/register'
import {
  verifyEmail,
  InvalidVerificationTokenError,
  ExpiredVerificationTokenError,
  AlreadyConsumedVerificationTokenError,
} from '../use-cases/verify-email'
import { UserRepository } from '../repository/user-repository'
import { getPrismaClient } from '../db'

export interface VerifyEmailHandlerConfig {
  databaseUrl: string
}

export async function handleVerifyEmail(event: H3Event, config: VerifyEmailHandlerConfig) {
  const raw = await readBody(event)
  const result = verifyEmailBodySchema.safeParse(raw)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid verification payload' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const userRepository = new UserRepository(prisma)

  try {
    await verifyEmail(result.data, { userRepository })
  } catch (error) {
    if (error instanceof InvalidVerificationTokenError) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid verification token' })
    }
    if (error instanceof ExpiredVerificationTokenError) {
      throw createError({ statusCode: 409, statusMessage: 'Verification token expired' })
    }
    if (error instanceof AlreadyConsumedVerificationTokenError) {
      throw createError({ statusCode: 409, statusMessage: 'Verification token already used' })
    }
    throw error
  }

  return { status: 'ok' }
}
