import { ref, type Ref } from 'vue'

export type ResetPasswordStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ResetPasswordFetcher {
  (body: { token: string; newPassword: string }): Promise<unknown>
}

export function useResetPasswordForm(fetcher: ResetPasswordFetcher) {
  const newPassword = ref('')
  const status: Ref<ResetPasswordStatus> = ref('idle')
  const errorMessage = ref('')

  async function submit(token: string | undefined) {
    if (typeof token !== 'string' || token.length === 0) {
      status.value = 'error'
      errorMessage.value = 'Liên kết đặt lại mật khẩu không hợp lệ.'
      return
    }

    status.value = 'loading'
    errorMessage.value = ''
    try {
      await fetcher({ token, newPassword: newPassword.value })
      status.value = 'success'
    } catch {
      status.value = 'error'
      errorMessage.value = 'Liên kết đã hết hạn hoặc đã được sử dụng.'
    }
  }

  return { newPassword, status, errorMessage, submit }
}
