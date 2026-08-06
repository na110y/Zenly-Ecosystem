import { readBody, createError, type H3Event } from 'h3'
import { forgotPasswordBodySchema } from '../dto/password-reset'
import { requestPasswordReset } from '../use-cases/request-password-reset'
import { UserRepository } from '../repository/user-repository'
import { ResendEmailAdapter } from '../adapters/resend-email-adapter'
import { getPrismaClient } from '../db'

export interface ForgotPasswordHandlerConfig {
  databaseUrl: string
  resendApiKey: string
  emailFrom: string
  public: { siteUrl?: string }
}

export async function handleForgotPassword(event: H3Event, config: ForgotPasswordHandlerConfig) {
  const raw = await readBody(event)
  const result = forgotPasswordBodySchema.safeParse(raw)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const userRepository = new UserRepository(prisma)
  const emailAdapter = new ResendEmailAdapter(config.resendApiKey, config.emailFrom)

  await requestPasswordReset(result.data, {
    userRepository,
    emailAdapter,
    resetUrlBase: `${config.public.siteUrl ?? ''}/account/password/reset`,
  })

  return { status: 'ok' }
}
