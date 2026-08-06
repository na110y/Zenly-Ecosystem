import { describe, it, expect, vi } from 'vitest'
import { useResetPasswordForm } from '../../app/composables/useResetPasswordForm'

describe('useResetPasswordForm', () => {
  it('sets status to error immediately when no token is provided, without calling the fetcher', async () => {
    const fetcher = vi.fn()
    const form = useResetPasswordForm(fetcher)

    await form.submit(undefined)

    expect(form.status.value).toBe('error')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('calls the fetcher with the token and new password, sets status to success', async () => {
    const fetcher = vi.fn().mockResolvedValue(undefined)
    const form = useResetPasswordForm(fetcher)
    form.newPassword.value = 'newpassword123'

    await form.submit('a-real-token')

    expect(fetcher).toHaveBeenCalledWith({ token: 'a-real-token', newPassword: 'newpassword123' })
    expect(form.status.value).toBe('success')
  })

  it('sets status to error with a message when the fetcher rejects', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('expired'))
    const form = useResetPasswordForm(fetcher)

    await form.submit('bad-token')

    expect(form.status.value).toBe('error')
    expect(form.errorMessage.value.length).toBeGreaterThan(0)
  })
})
