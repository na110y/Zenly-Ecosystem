import { describe, it, expect } from 'vitest'

describe('setup smoke test', () => {
  it('vitest runner works', () => {
    expect(1 + 1).toBe(2)
  })

  it('can import from vue', async () => {
    const { ref } = await import('vue')
    const count = ref(0)
    expect(count.value).toBe(0)
  })
})
