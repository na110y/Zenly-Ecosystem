import { describe, it, expect, vi } from 'vitest'
import { useProfileForm } from '../../app/composables/useProfileForm'

describe('useProfileForm', () => {
  it('loads the profile into the form fields', async () => {
    const fetcher = {
      get: vi.fn().mockResolvedValue({ displayName: 'A', email: 'a@example.com' }),
      update: vi.fn(),
    }
    const form = useProfileForm(fetcher)

    await form.load()

    expect(form.displayName.value).toBe('A')
    expect(form.email.value).toBe('a@example.com')
    expect(form.status.value).toBe('idle')
  })

  it('sets status to error when load fails', async () => {
    const fetcher = { get: vi.fn().mockRejectedValue(new Error('401')), update: vi.fn() }
    const form = useProfileForm(fetcher)

    await form.load()

    expect(form.status.value).toBe('error')
  })

  it('submits the displayName and sets status to success', async () => {
    const fetcher = { get: vi.fn(), update: vi.fn().mockResolvedValue(undefined) }
    const form = useProfileForm(fetcher)
    form.displayName.value = 'New Name'

    await form.submit()

    expect(fetcher.update).toHaveBeenCalledWith({ displayName: 'New Name' })
    expect(form.status.value).toBe('success')
  })

  it('sets status to error when submit fails', async () => {
    const fetcher = { get: vi.fn(), update: vi.fn().mockRejectedValue(new Error('400')) }
    const form = useProfileForm(fetcher)

    await form.submit()

    expect(form.status.value).toBe('error')
  })
})
