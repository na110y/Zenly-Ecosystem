import { setResponseHeader, setResponseStatus, send, type H3Error, type H3Event } from 'h3'
import { createErrorEnvelope, type ErrorCode } from './utils/error-envelope'
import { getRequestId } from './utils/request-context'

function resolveErrorCode(statusCode: number): ErrorCode {
  switch (statusCode) {
    case 400:
      return 'VALIDATION_ERROR'
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    case 429:
      return 'RATE_LIMITED'
    default:
      return 'INTERNAL_ERROR'
  }
}

export default function handleError(error: H3Error, event: H3Event) {
  const statusCode = error.statusCode ?? 500
  const code = resolveErrorCode(statusCode)
  const message =
    statusCode < 500 && error.statusMessage ? error.statusMessage : 'Internal server error'
  const requestId = getRequestId(event)

  setResponseStatus(event, statusCode)
  setResponseHeader(event, 'Content-Type', 'application/json')
  return send(event, JSON.stringify(createErrorEnvelope(code, message, requestId)))
}
