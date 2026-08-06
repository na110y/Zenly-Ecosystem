import { defineEventHandler } from 'h3'
import { handleLogin } from '../../identity/handlers/login-handler'

export default defineEventHandler((event) => handleLogin(event, useRuntimeConfig(event)))
