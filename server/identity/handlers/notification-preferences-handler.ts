import { readBody, createError, type H3Event } from 'h3'
import { updateNotificationPreferencesBodySchema } from '../dto/profile'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../use-cases/notification-preferences'
import { UserRepository } from '../repository/user-repository'
import { getPrismaClient } from '../db'
import { getUserContext } from '../context'

export interface NotificationPreferencesHandlerConfig {
  databaseUrl: string
}

export async function handleGetNotificationPreferences(
  event: H3Event,
  config: NotificationPreferencesHandlerConfig,
) {
  const context = getUserContext(event)
  if (!context) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const userRepository = new UserRepository(prisma)
  return getNotificationPreferences(context.userId, { userRepository })
}

export async function handleUpdateNotificationPreferences(
  event: H3Event,
  config: NotificationPreferencesHandlerConfig,
) {
  const context = getUserContext(event)
  if (!context) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const raw = await readBody(event)
  const result = updateNotificationPreferencesBodySchema.safeParse(raw)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const userRepository = new UserRepository(prisma)
  return updateNotificationPreferences(context.userId, result.data, { userRepository })
}
