import { ref, type Ref } from 'vue'

export type AdminTotpSetupStep = 'login' | 'setup' | 'activate' | 'done'
export type AdminTotpSetupStatus = 'idle' | 'loading' | 'error'

export interface AdminLoginFetcher {
  (body: { email: string; password: string }): Promise<unknown>
}

export interface AdminTotpSetupFetcher {
  (): Promise<{ qrCodeDataUrl: string }>
}

export interface AdminTotpActivateFetcher {
  (body: { code: string }): Promise<unknown>
}

export function useAdminTotpSetup(deps: {
  login: AdminLoginFetcher
  setup: AdminTotpSetupFetcher
  activate: AdminTotpActivateFetcher
}) {
  const step: Ref<AdminTotpSetupStep> = ref('login')
  const status: Ref<AdminTotpSetupStatus> = ref('idle')
  const errorMessage = ref('')

  const email = ref('')
  const password = ref('')
  const code = ref('')
  const qrCodeDataUrl = ref('')

  async function submitLogin() {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      await deps.login({ email: email.value, password: password.value })
      const result = await deps.setup()
      qrCodeDataUrl.value = result.qrCodeDataUrl
      step.value = 'activate'
      status.value = 'idle'
    } catch {
      status.value = 'error'
      errorMessage.value = 'Email hoặc mật khẩu không đúng.'
    }
  }

  async function submitActivate() {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      await deps.activate({ code: code.value })
      step.value = 'done'
      status.value = 'idle'
    } catch {
      status.value = 'error'
      errorMessage.value = 'Mã xác minh không đúng.'
    }
  }

  return {
    step,
    status,
    errorMessage,
    email,
    password,
    code,
    qrCodeDataUrl,
    submitLogin,
    submitActivate,
  }
}
