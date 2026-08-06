export const USER_SESSION_COOKIE = 'UserSession'
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function sessionExpiryDate(): Date {
  return new Date(Date.now() + SESSION_TTL_MS)
}
