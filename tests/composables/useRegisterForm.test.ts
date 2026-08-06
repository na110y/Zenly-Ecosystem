import { describe, it, expect, vi } from 'vitest'
import { useRegisterForm } from '../../app/composables/useRegisterForm'

describe('useRegisterForm', () => {
  it('starts in idle status with empty fields', () => {
    const form = useRegisterForm(vi.fn())
    expect(form.status.value).toBe('idle')
    expect(form.email.value).toBe('')
    expect(form.password.value).toBe('')
    expect(form.displayName.value).toBe('')
  })

  it('sets status to success and calls the fetcher with the form values on submit', async () => {
    const fetcher = vi.fn().mockResolvedValue(undefined)
    const form = useRegisterForm(fetcher)
    form.email.value = 'a@example.com'
    form.password.value = 'password123'
    form.displayName.value = 'A'

    await form.submit()

    expect(fetcher).toHaveBeenCalledWith({
      email: 'a@example.com',
      password: 'password123',
      displayName: 'A',
    })
    expect(form.status.value).toBe('success')
  })

  it('sets status to error and a user-facing message when the fetcher rejects', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network error'))
    const form = useRegisterForm(fetcher)

    await form.submit()

    expect(form.status.value).toBe('error')
    expect(form.errorMessage.value.length).toBeGreaterThan(0)
  })

  it('sets status to loading synchronously before the fetcher resolves', () => {
    let resolveFetch: () => void
    const fetcher = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFetch = resolve
        }),
    )
    const form = useRegisterForm(fetcher)

    const submitPromise = form.submit()
    expect(form.status.value).toBe('loading')

    resolveFetch!()
    return submitPromise
  })
})
