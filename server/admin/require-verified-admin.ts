import { createError, type H3Event } from 'h3'
import { getAdminContext, type AdminContext } from './context'

export function requireVerifiedAdmin(event: H3Event): AdminContext {
  const context = getAdminContext(event)
  if (!context) {
    throw createError({ statusCode: 401, statusMessage: 'Admin session required' })
  }
  if (!context.totpVerifiedAt) {
    throw createError({ statusCode: 403, statusMessage: 'TOTP verification required' })
  }
  return context
}
