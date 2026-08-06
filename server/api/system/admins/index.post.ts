import { defineEventHandler } from 'h3'
import { handleCreateAdminAccount } from '../../../admin/handlers/create-admin-account-handler'

export default defineEventHandler((event) =>
  handleCreateAdminAccount(event, useRuntimeConfig(event)),
)
