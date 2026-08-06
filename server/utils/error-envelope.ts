export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

export interface ErrorEnvelope {
  error: {
    code: ErrorCode
    message: string
    requestId: string
  }
}

export function createErrorEnvelope(
  code: ErrorCode,
  message: string,
  requestId: string,
): ErrorEnvelope {
  return {
    error: {
      code,
      message,
      requestId,
    },
  }
}
