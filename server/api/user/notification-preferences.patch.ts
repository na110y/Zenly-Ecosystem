import { defineEventHandler } from 'h3'
import { handleUpdateNotificationPreferences } from '../../identity/handlers/notification-preferences-handler'

export default defineEventHandler((event) =>
  handleUpdateNotificationPreferences(event, useRuntimeConfig(event)),
)
