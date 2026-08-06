import { describe, it, expect } from 'vitest'
import { createErrorEnvelope, ERROR_CODES } from '../../server/utils/error-envelope'

describe('createErrorEnvelope', () => {
  it.each(ERROR_CODES)('produces the correct envelope shape for code %s', (code) => {
    const envelope = createErrorEnvelope(code, 'a safe message', 'req-123')
    expect(envelope).toEqual({
      error: {
        code,
        message: 'a safe message',
        requestId: 'req-123',
      },
    })
  })

  it('never includes fields beyond code/message/requestId', () => {
    const envelope = createErrorEnvelope('NOT_FOUND', 'msg', 'req-1')
    expect(Object.keys(envelope)).toEqual(['error'])
    expect(Object.keys(envelope.error).sort()).toEqual(['code', 'message', 'requestId'])
  })
})
