import { defineEventHandler, setResponseHeader } from 'h3'
import { generateRequestId, setRequestId } from '../utils/request-context'

export default defineEventHandler((event) => {
  const requestId = generateRequestId()
  setRequestId(event, requestId)
  setResponseHeader(event, 'X-Request-Id', requestId)
})
