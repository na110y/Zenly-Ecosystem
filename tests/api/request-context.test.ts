import { describe, it, expect } from 'vitest'
import { generateRequestId, setRequestId, getRequestId } from '../../server/utils/request-context'
import type { H3Event } from 'h3'

function fakeEvent(): H3Event {
  return { context: {} } as H3Event
}

describe('request context utils', () => {
  it('generateRequestId produces a valid UUID', () => {
    expect(generateRequestId()).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('generateRequestId produces different values on each call', () => {
    expect(generateRequestId()).not.toBe(generateRequestId())
  })

  it('setRequestId then getRequestId round-trips the same value', () => {
    const event = fakeEvent()
    setRequestId(event, 'abc-123')
    expect(getRequestId(event)).toBe('abc-123')
  })

  it('getRequestId throws if the middleware never ran', () => {
    const event = fakeEvent()
    expect(() => getRequestId(event)).toThrow('requestId is missing')
  })
})
