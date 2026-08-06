import { envSchema, type Env } from './schema'

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Environment validation failed: ${issues.join('; ')}`)
    this.name = 'EnvValidationError'
  }
}

export function validateEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source)

  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    throw new EnvValidationError(issues)
  }

  return result.data
}
