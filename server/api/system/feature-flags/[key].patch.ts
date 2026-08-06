import { defineEventHandler } from 'h3'
import { handleUpdateFeatureFlag } from '../../../admin/handlers/update-feature-flag-handler'

export default defineEventHandler((event) =>
  handleUpdateFeatureFlag(event, useRuntimeConfig(event)),
)
