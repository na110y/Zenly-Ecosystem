import type { H3Event } from 'h3'

const ADMIN_CONTEXT_KEY = 'admin'

export interface AdminContext {
  adminAccountId: string
  role: 'ADMIN' | 'SUPER_ADMIN'
  totpVerifiedAt: Date | null
}

export function setAdminContext(event: H3Event, context: AdminContext): void {
  event.context[ADMIN_CONTEXT_KEY] = context
}

export function getAdminContext(event: H3Event): AdminContext | undefined {
  return event.context[ADMIN_CONTEXT_KEY] as AdminContext | undefined
}
