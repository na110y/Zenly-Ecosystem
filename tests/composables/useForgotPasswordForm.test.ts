import { describe, it, expect, vi } from 'vitest'
import { useForgotPasswordForm } from '../../app/composables/useForgotPasswordForm'

describe('useForgotPasswordForm', () => {
  it('calls the fetcher and sets status to success', async () => {
    const fetcher = vi.fn().mockResolvedValue(undefined)
    const form = useForgotPasswordForm(fetcher)
    form.email.value = 'a@example.com'

    await form.submit()

    expect(fetcher).toHaveBeenCalledWith({ email: 'a@example.com' })
    expect(form.status.value).toBe('success')
  })

  it('sets status to error when the fetcher rejects', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'))
    const form = useForgotPasswordForm(fetcher)

    await form.submit()

    expect(form.status.value).toBe('error')
  })
})
