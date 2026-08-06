import { defineEventHandler } from 'h3'
import { handleAdminLogin } from '../../admin/handlers/login-handler'

export default defineEventHandler((event) => handleAdminLogin(event, useRuntimeConfig(event)))
