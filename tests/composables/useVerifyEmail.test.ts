import { describe, it, expect, vi } from 'vitest'
import { useVerifyEmail } from '../../app/composables/useVerifyEmail'

describe('useVerifyEmail', () => {
  it('starts in loading status', () => {
    const { status } = useVerifyEmail(vi.fn())
    expect(status.value).toBe('loading')
  })

  it('sets status to error immediately when the token is undefined, without calling the fetcher', async () => {
    const fetcher = vi.fn()
    const { status, verify } = useVerifyEmail(fetcher)

    await verify(undefined)

    expect(status.value).toBe('error')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('sets status to error immediately when the token is an empty string', async () => {
    const fetcher = vi.fn()
    const { status, verify } = useVerifyEmail(fetcher)

    await verify('')

    expect(status.value).toBe('error')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('calls the fetcher with the token and sets status to success on resolve', async () => {
    const fetcher = vi.fn().mockResolvedValue(undefined)
    const { status, verify } = useVerifyEmail(fetcher)

    await verify('a-real-token')

    expect(fetcher).toHaveBeenCalledWith({ token: 'a-real-token' })
    expect(status.value).toBe('success')
  })

  it('sets status to error when the fetcher rejects', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('invalid token'))
    const { status, verify } = useVerifyEmail(fetcher)

    await verify('bad-token')

    expect(status.value).toBe('error')
  })
})
