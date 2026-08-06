import { readBody, createError, type H3Event } from 'h3'
import { updateProfileBodySchema } from '../dto/profile'
import { getProfile, updateProfile } from '../use-cases/profile'
import { UserRepository } from '../repository/user-repository'
import { getPrismaClient } from '../db'
import { getUserContext } from '../context'

export interface ProfileHandlerConfig {
  databaseUrl: string
}

export async function handleGetProfile(event: H3Event, config: ProfileHandlerConfig) {
  const context = getUserContext(event)
  if (!context) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const userRepository = new UserRepository(prisma)
  return getProfile(context.userId, { userRepository })
}

export async function handleUpdateProfile(event: H3Event, config: ProfileHandlerConfig) {
  const context = getUserContext(event)
  if (!context) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const raw = await readBody(event)
  const result = updateProfileBodySchema.safeParse(raw)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const userRepository = new UserRepository(prisma)
  return updateProfile(context.userId, result.data, { userRepository })
}
