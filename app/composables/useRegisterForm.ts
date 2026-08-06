import { ref, type Ref } from 'vue'

export type RegisterStatus = 'idle' | 'loading' | 'success' | 'error'

export interface RegisterFetcher {
  (body: { email: string; password: string; displayName: string }): Promise<unknown>
}

export function useRegisterForm(fetcher: RegisterFetcher) {
  const email = ref('')
  const password = ref('')
  const displayName = ref('')
  const status: Ref<RegisterStatus> = ref('idle')
  const errorMessage = ref('')

  async function submit() {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      await fetcher({
        email: email.value,
        password: password.value,
        displayName: displayName.value,
      })
      status.value = 'success'
    } catch {
      status.value = 'error'
      errorMessage.value = 'Đăng ký thất bại. Vui lòng thử lại.'
    }
  }

  return { email, password, displayName, status, errorMessage, submit }
}
