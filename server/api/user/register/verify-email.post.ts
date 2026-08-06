import { defineEventHandler } from 'h3'
import { handleVerifyEmail } from '../../../identity/handlers/verify-email-handler'

export default defineEventHandler((event) => handleVerifyEmail(event, useRuntimeConfig(event)))
