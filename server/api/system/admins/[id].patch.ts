import { defineEventHandler } from 'h3'
import { handleUpdateAdminAccount } from '../../../admin/handlers/update-admin-account-handler'

export default defineEventHandler((event) =>
  handleUpdateAdminAccount(event, useRuntimeConfig(event)),
)
