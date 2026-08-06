import { describe, it, expect, vi } from 'vitest'
import { useAdminTotpSetup } from '../../app/composables/useAdminTotpSetup'

function fakeDeps(overrides: Partial<Parameters<typeof useAdminTotpSetup>[0]> = {}) {
  return {
    login: vi.fn().mockResolvedValue(undefined),
    setup: vi.fn().mockResolvedValue({ qrCodeDataUrl: 'data:image/png;base64,fake' }),
    activate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('useAdminTotpSetup', () => {
  it('starts on the login step, idle, with empty fields', () => {
    const form = useAdminTotpSetup(fakeDeps())
    expect(form.step.value).toBe('login')
    expect(form.status.value).toBe('idle')
    expect(form.email.value).toBe('')
    expect(form.password.value).toBe('')
  })

  it('submitLogin logs in, fetches the QR code, and advances to the activate step', async () => {
    const deps = fakeDeps()
    const form = useAdminTotpSetup(deps)
    form.email.value = 'admin@example.com'
    form.password.value = 'password123'

    await form.submitLogin()

    expect(deps.login).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'password123',
    })
    expect(deps.setup).toHaveBeenCalled()
    expect(form.step.value).toBe('activate')
    expect(form.qrCodeDataUrl.value).toBe('data:image/png;base64,fake')
    expect(form.status.value).toBe('idle')
  })

  it('submitLogin sets an error and stays on the login step when login rejects', async () => {
    const deps = fakeDeps({ login: vi.fn().mockRejectedValue(new Error('401')) })
    const form = useAdminTotpSetup(deps)

    await form.submitLogin()

    expect(form.step.value).toBe('login')
    expect(form.status.value).toBe('error')
    expect(form.errorMessage.value.length).toBeGreaterThan(0)
    expect(deps.setup).not.toHaveBeenCalled()
  })

  it('submitActivate advances to the done step on success', async () => {
    const deps = fakeDeps()
    const form = useAdminTotpSetup(deps)
    form.code.value = '123456'

    await form.submitActivate()

    expect(deps.activate).toHaveBeenCalledWith({ code: '123456' })
    expect(form.step.value).toBe('done')
    expect(form.status.value).toBe('idle')
  })

  it('submitActivate sets an error and stays on the activate step when activation rejects', async () => {
    const deps = fakeDeps({ activate: vi.fn().mockRejectedValue(new Error('401')) })
    const form = useAdminTotpSetup(deps)
    form.step.value = 'activate'
    form.code.value = '000000'

    await form.submitActivate()

    expect(form.step.value).toBe('activate')
    expect(form.status.value).toBe('error')
    expect(form.errorMessage.value.length).toBeGreaterThan(0)
  })
})
