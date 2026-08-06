import { randomUUID } from 'node:crypto'
import type { H3Event } from 'h3'

const REQUEST_ID_KEY = 'requestId'

export function setRequestId(event: H3Event, requestId: string): void {
  event.context[REQUEST_ID_KEY] = requestId
}

export function getRequestId(event: H3Event): string {
  const requestId = event.context[REQUEST_ID_KEY]
  if (typeof requestId !== 'string' || requestId.length === 0) {
    throw new Error(
      'requestId is missing from event context; request-context middleware did not run',
    )
  }
  return requestId
}

export function generateRequestId(): string {
  return randomUUID()
}
