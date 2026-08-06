import { generateToken, hashToken } from '../token'
import type { UserRepository } from '../repository/user-repository'
import type { EmailAdapter } from '../adapters/email-adapter'

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000

export interface RequestPasswordResetInput {
  email: string
}

export interface RequestPasswordResetDeps {
  userRepository: UserRepository
  emailAdapter: EmailAdapter
  resetUrlBase: string
}

export async function requestPasswordReset(
  input: RequestPasswordResetInput,
  deps: RequestPasswordResetDeps,
): Promise<void> {
  const user = await deps.userRepository.findByEmail(input.email)
  if (!user) {
    return
  }

  const token = generateToken()
  await deps.userRepository.createPasswordResetToken({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
  })

  try {
    await deps.emailAdapter.send({
      to: user.email,
      subject: 'Đặt lại mật khẩu',
      html: `<p>Nhấn vào link sau để đặt lại mật khẩu: <a href="${deps.resetUrlBase}?token=${token}">Đặt lại mật khẩu</a></p>`,
    })
  } catch {
    // Provider failure must not fail the request — same fail-open policy as registration.
  }
}
