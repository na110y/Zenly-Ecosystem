import { ref, type Ref } from 'vue'

export type ProfileStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ProfileData {
  displayName: string
  email: string
}

export interface ProfileFetcher {
  get(): Promise<ProfileData>
  update(body: { displayName: string }): Promise<unknown>
}

export function useProfileForm(fetcher: ProfileFetcher) {
  const displayName = ref('')
  const email = ref('')
  const status: Ref<ProfileStatus> = ref('idle')

  async function load() {
    status.value = 'loading'
    try {
      const profile = await fetcher.get()
      displayName.value = profile.displayName
      email.value = profile.email
      status.value = 'idle'
    } catch {
      status.value = 'error'
    }
  }

  async function submit() {
    status.value = 'loading'
    try {
      await fetcher.update({ displayName: displayName.value })
      status.value = 'success'
    } catch {
      status.value = 'error'
    }
  }

  return { displayName, email, status, load, submit }
}
