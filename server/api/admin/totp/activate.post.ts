import { defineEventHandler } from 'h3'
import { handleAdminTotpActivate } from '../../../admin/handlers/totp-activate-handler'

export default defineEventHandler((event) =>
  handleAdminTotpActivate(event, useRuntimeConfig(event)),
)
