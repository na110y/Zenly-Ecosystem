import { defineEventHandler } from 'h3'
import { handleLogout } from '../../identity/handlers/logout-handler'

export default defineEventHandler((event) => handleLogout(event, useRuntimeConfig(event)))
