// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { getPrismaClient } from '../../server/identity/db'

describe('getPrismaClient', () => {
  it('returns a PrismaClient-shaped object', () => {
    const client = getPrismaClient('postgresql://fake:fake@localhost:1/fake')
    expect(client).toBeDefined()
    expect(typeof client.user.create).toBe('function')
  })

  it('returns the same instance on subsequent calls (singleton, even with a different url)', () => {
    const first = getPrismaClient('postgresql://fake:fake@localhost:1/fake')
    const second = getPrismaClient('postgresql://different:different@localhost:2/different')
    expect(first).toBe(second)
  })
})
