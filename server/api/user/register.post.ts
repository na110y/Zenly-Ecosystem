import { defineEventHandler } from 'h3'
import { handleRegister } from '../../identity/handlers/register-handler'

export default defineEventHandler((event) => handleRegister(event, useRuntimeConfig(event)))
