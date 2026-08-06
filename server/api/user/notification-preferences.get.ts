import { defineEventHandler } from 'h3'
import { handleGetNotificationPreferences } from '../../identity/handlers/notification-preferences-handler'

export default defineEventHandler((event) =>
  handleGetNotificationPreferences(event, useRuntimeConfig(event)),
)
