import { defineEventHandler } from 'h3'
import { handleListFeatureFlags } from '../../../admin/handlers/list-feature-flags-handler'

export default defineEventHandler((event) => handleListFeatureFlags(event, useRuntimeConfig(event)))
