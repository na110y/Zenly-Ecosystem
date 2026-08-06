import { defineEventHandler } from 'h3'
import { requireSuperAdmin } from '../../admin/require-super-admin'

export default defineEventHandler((event) => {
  const context = requireSuperAdmin(event)
  return { adminAccountId: context.adminAccountId, role: context.role }
})
