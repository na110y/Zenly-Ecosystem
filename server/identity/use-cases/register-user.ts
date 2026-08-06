import { Prisma } from '@prisma/client'
import { hashPassword } from '../password'
import { generateToken, hashToken } from '../token'
import type { UserRepository } from '../repository/user-repository'
import type { EmailAdapter } from '../adapters/email-adapter'

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002'

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_CONSTRAINT_VIOLATION
  )
}

const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

export interface RegisterUserInput {
  email: string
  password: string
  displayName: string
}

export interface RegisterUserDeps {
  userRepository: UserRepository
  emailAdapter: EmailAdapter
  verifyUrlBase: string
}

export async function registerUser(
  input: RegisterUserInput,
  deps: RegisterUserDeps,
): Promise<void> {
  const existing = await deps.userRepository.findByEmail(input.email)
  if (existing) {
    return
  }

  const passwordHash = await hashPassword(input.password)
  let user
  try {
    user = await deps.userRepository.createUser({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
    })
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      // Lost the race to a concurrent registration for the same email — treat identically
      // to the existing-user early return above (no enumeration, no duplicate row).
      return
    }
    throw error
  }

  const token = generateToken()
  await deps.userRepository.createEmailVerificationToken({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS),
  })

  try {
    await deps.emailAdapter.send({
      to: user.email,
      subject: 'Xác minh email của bạn',
      html: `<p>Nhấn vào link sau để xác minh email: <a href="${deps.verifyUrlBase}?token=${token}">Xác minh</a></p>`,
    })
  } catch {
    // Provider failure must not fail registration; the user can request a resend later.
    // Swallowed intentionally — email delivery is best-effort at this step.
  }
}
