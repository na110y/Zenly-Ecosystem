import { defineEventHandler, createError } from 'h3'
import { getUserContext } from '../../identity/context'

export default defineEventHandler((event) => {
  const context = getUserContext(event)
  if (!context) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  return { userId: context.userId }
})
