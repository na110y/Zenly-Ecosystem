import { defineEventHandler } from 'h3'
import { handleListAdminAccounts } from '../../../admin/handlers/list-admin-accounts-handler'

export default defineEventHandler((event) =>
  handleListAdminAccounts(event, useRuntimeConfig(event)),
)
