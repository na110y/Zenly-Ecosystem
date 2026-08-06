import { ref, type Ref } from 'vue'

export type VerifyStatus = 'loading' | 'success' | 'error'

export interface VerifyFetcher {
  (body: { token: string }): Promise<unknown>
}

export function useVerifyEmail(fetcher: VerifyFetcher) {
  const status: Ref<VerifyStatus> = ref('loading')

  async function verify(token: string | undefined) {
    if (typeof token !== 'string' || token.length === 0) {
      status.value = 'error'
      return
    }

    try {
      await fetcher({ token })
      status.value = 'success'
    } catch {
      status.value = 'error'
    }
  }

  return { status, verify }
}
