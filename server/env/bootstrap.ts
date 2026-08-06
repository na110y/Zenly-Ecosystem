import { validateEnv, EnvValidationError } from './validate'

export function bootstrapEnv(): void {
  try {
    validateEnv()
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message)
    }
    throw error
  }
}
