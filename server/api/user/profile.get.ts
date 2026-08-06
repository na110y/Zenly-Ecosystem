import { defineEventHandler } from 'h3'
import { handleGetProfile } from '../../identity/handlers/profile-handler'

export default defineEventHandler((event) => handleGetProfile(event, useRuntimeConfig(event)))
