export const ADMIN_SESSION_COOKIE = 'AdminSession'
export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000

export function adminSessionExpiryDate(): Date {
  return new Date(Date.now() + ADMIN_SESSION_TTL_MS)
}
