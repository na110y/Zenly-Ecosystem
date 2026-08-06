import { ref, type Ref } from 'vue'

export type ForgotPasswordStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ForgotPasswordFetcher {
  (body: { email: string }): Promise<unknown>
}

export function useForgotPasswordForm(fetcher: ForgotPasswordFetcher) {
  const email = ref('')
  const status: Ref<ForgotPasswordStatus> = ref('idle')

  async function submit() {
    status.value = 'loading'
    try {
      await fetcher({ email: email.value })
      status.value = 'success'
    } catch {
      status.value = 'error'
    }
  }

  return { email, status, submit }
}
