import type { H3Event } from 'h3'

const USER_CONTEXT_KEY = 'user'

export interface UserContext {
  userId: string
}

export function setUserContext(event: H3Event, context: UserContext): void {
  event.context[USER_CONTEXT_KEY] = context
}

export function getUserContext(event: H3Event): UserContext | undefined {
  return event.context[USER_CONTEXT_KEY] as UserContext | undefined
}
