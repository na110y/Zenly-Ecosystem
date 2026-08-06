import { defineEventHandler } from 'h3'
import { handleResetPassword } from '../../../identity/handlers/reset-password-handler'

export default defineEventHandler((event) => handleResetPassword(event, useRuntimeConfig(event)))
