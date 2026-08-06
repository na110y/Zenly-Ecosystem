import { defineEventHandler } from 'h3'
import { handleUpdateProfile } from '../../identity/handlers/profile-handler'

export default defineEventHandler((event) => handleUpdateProfile(event, useRuntimeConfig(event)))
