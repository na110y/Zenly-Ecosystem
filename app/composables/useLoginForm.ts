import { ref, type Ref } from 'vue'

export type LoginStatus = 'idle' | 'loading' | 'success' | 'error'

export interface LoginFetcher {
  (body: { email: string; password: string }): Promise<unknown>
}

export function useLoginForm(fetcher: LoginFetcher) {
  const email = ref('')
  const password = ref('')
  const status: Ref<LoginStatus> = ref('idle')
  const errorMessage = ref('')

  async function submit() {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      await fetcher({ email: email.value, password: password.value })
      status.value = 'success'
    } catch {
      status.value = 'error'
      errorMessage.value = 'Email hoặc mật khẩu không đúng.'
    }
  }

  return { email, password, status, errorMessage, submit }
}
