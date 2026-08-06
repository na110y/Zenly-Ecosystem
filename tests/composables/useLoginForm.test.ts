import { describe, it, expect, vi } from 'vitest'
import { useLoginForm } from '../../app/composables/useLoginForm'

describe('useLoginForm', () => {
  it('starts idle with empty fields', () => {
    const form = useLoginForm(vi.fn())
    expect(form.status.value).toBe('idle')
    expect(form.email.value).toBe('')
    expect(form.password.value).toBe('')
  })

  it('calls the fetcher with the form values and sets status to success', async () => {
    const fetcher = vi.fn().mockResolvedValue(undefined)
    const form = useLoginForm(fetcher)
    form.email.value = 'a@example.com'
    form.password.value = 'password123'

    await form.submit()

    expect(fetcher).toHaveBeenCalledWith({ email: 'a@example.com', password: 'password123' })
    expect(form.status.value).toBe('success')
  })

  it('sets status to error with a generic message when the fetcher rejects', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('401'))
    const form = useLoginForm(fetcher)

    await form.submit()

    expect(form.status.value).toBe('error')
    expect(form.errorMessage.value.length).toBeGreaterThan(0)
  })
})
