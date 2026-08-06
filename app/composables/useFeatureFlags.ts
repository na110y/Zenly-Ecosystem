import { ref, type Ref } from 'vue'

export type FeatureFlagsStatus = 'loading' | 'empty' | 'error' | 'success'
export type FeatureFlagScope = 'ADMIN_MANAGEABLE' | 'SUPER_ADMIN_ONLY'

export interface FeatureFlagItem {
  key: string
  enabled: boolean
  scope: FeatureFlagScope
  version: number
}

export interface FeatureFlagsFetcher {
  (): Promise<FeatureFlagItem[]>
}

export interface FeatureFlagsUpdater {
  (key: string, body: { enabled: boolean; expectedVersion: number }): Promise<FeatureFlagItem>
}

export function useFeatureFlags(deps: {
  fetchFlags: FeatureFlagsFetcher
  updateFlag: FeatureFlagsUpdater
}) {
  const status: Ref<FeatureFlagsStatus> = ref('loading')
  const flags: Ref<FeatureFlagItem[]> = ref([])
  const errorMessage = ref('')
  const toggleErrorKey = ref('')

  async function load() {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      const result = await deps.fetchFlags()
      flags.value = result
      status.value = result.length === 0 ? 'empty' : 'success'
    } catch {
      status.value = 'error'
      errorMessage.value = 'Không thể tải danh sách feature flag.'
    }
  }

  async function toggle(flag: FeatureFlagItem) {
    toggleErrorKey.value = ''
    try {
      const updated = await deps.updateFlag(flag.key, {
        enabled: !flag.enabled,
        expectedVersion: flag.version,
      })
      const index = flags.value.findIndex((item) => item.key === flag.key)
      if (index !== -1) {
        flags.value[index] = updated
      }
    } catch {
      toggleErrorKey.value = flag.key
      await load()
    }
  }

  return { status, flags, errorMessage, toggleErrorKey, load, toggle }
}
