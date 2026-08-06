import { createError, type H3Event } from 'h3'
import { requireVerifiedAdmin } from './require-verified-admin'
import type { AdminContext } from './context'

export function requireSuperAdmin(event: H3Event): AdminContext {
  const context = requireVerifiedAdmin(event)
  if (context.role !== 'SUPER_ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'SUPER_ADMIN role required' })
  }
  return context
}
