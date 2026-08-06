import { defineEventHandler } from 'h3'
import { handleAdminLoginTotp } from '../../../admin/handlers/login-totp-handler'

export default defineEventHandler((event) => handleAdminLoginTotp(event, useRuntimeConfig(event)))
