import { defineEventHandler } from 'h3'
import { handleForgotPassword } from '../../../identity/handlers/forgot-password-handler'

export default defineEventHandler((event) => handleForgotPassword(event, useRuntimeConfig(event)))
