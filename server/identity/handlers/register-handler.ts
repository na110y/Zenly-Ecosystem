import { readBody, createError, type H3Event } from 'h3'
import { registerBodySchema } from '../dto/register'
import { registerUser } from '../use-cases/register-user'
import { UserRepository } from '../repository/user-repository'
import { ResendEmailAdapter } from '../adapters/resend-email-adapter'
import { getPrismaClient } from '../db'

export interface RegisterHandlerConfig {
  databaseUrl: string
  resendApiKey: string
  emailFrom: string
  public: { siteUrl?: string }
}

export async function handleRegister(event: H3Event, config: RegisterHandlerConfig) {
  const raw = await readBody(event)
  const result = registerBodySchema.safeParse(raw)
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid registration payload' })
  }

  const prisma = getPrismaClient(config.databaseUrl)
  const userRepository = new UserRepository(prisma)
  const emailAdapter = new ResendEmailAdapter(config.resendApiKey, config.emailFrom)

  await registerUser(result.data, {
    userRepository,
    emailAdapter,
    verifyUrlBase: `${config.public.siteUrl ?? ''}/account/verify-email`,
  })

  return { status: 'ok' }
}
