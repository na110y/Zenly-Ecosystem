import { describe, it, expect, vi } from 'vitest'
import { useFeatureFlags, type FeatureFlagItem } from '../../app/composables/useFeatureFlags'

const sampleFlags: FeatureFlagItem[] = [
  { key: 'user_posting_enabled', enabled: false, scope: 'ADMIN_MANAGEABLE', version: 1 },
  { key: 'community_feature_enabled', enabled: false, scope: 'SUPER_ADMIN_ONLY', version: 1 },
]

describe('useFeatureFlags', () => {
  it('starts in loading status', () => {
    const composable = useFeatureFlags({
      fetchFlags: vi.fn().mockResolvedValue(sampleFlags),
      updateFlag: vi.fn(),
    })
    expect(composable.status.value).toBe('loading')
  })

  it('load() sets status to success and populates flags on a non-empty result', async () => {
    const composable = useFeatureFlags({
      fetchFlags: vi.fn().mockResolvedValue(sampleFlags),
      updateFlag: vi.fn(),
    })

    await composable.load()

    expect(composable.status.value).toBe('success')
    expect(composable.flags.value).toEqual(sampleFlags)
  })

  it('load() sets status to empty when the fetcher returns no flags', async () => {
    const composable = useFeatureFlags({
      fetchFlags: vi.fn().mockResolvedValue([]),
      updateFlag: vi.fn(),
    })

    await composable.load()

    expect(composable.status.value).toBe('empty')
  })

  it('load() sets status to error when the fetcher rejects', async () => {
    const composable = useFeatureFlags({
      fetchFlags: vi.fn().mockRejectedValue(new Error('network error')),
      updateFlag: vi.fn(),
    })

    await composable.load()

    expect(composable.status.value).toBe('error')
    expect(composable.errorMessage.value.length).toBeGreaterThan(0)
  })

  it('toggle() flips enabled and updates the flag in place on success', async () => {
    const updateFlag = vi.fn().mockResolvedValue({
      key: 'user_posting_enabled',
      enabled: true,
      scope: 'ADMIN_MANAGEABLE',
      version: 2,
    })
    const composable = useFeatureFlags({
      fetchFlags: vi.fn().mockResolvedValue(sampleFlags),
      updateFlag,
    })
    await composable.load()

    await composable.toggle(composable.flags.value[0])

    expect(updateFlag).toHaveBeenCalledWith('user_posting_enabled', {
      enabled: true,
      expectedVersion: 1,
    })
    expect(composable.flags.value[0]).toEqual({
      key: 'user_posting_enabled',
      enabled: true,
      scope: 'ADMIN_MANAGEABLE',
      version: 2,
    })
  })

  it('toggle() sets toggleErrorKey and reloads the list on failure (e.g. 403 or 409)', async () => {
    const fetchFlags = vi.fn().mockResolvedValue(sampleFlags)
    const updateFlag = vi.fn().mockRejectedValue(new Error('forbidden'))
    const composable = useFeatureFlags({ fetchFlags, updateFlag })
    await composable.load()
    fetchFlags.mockClear()

    await composable.toggle(composable.flags.value[1])

    expect(composable.toggleErrorKey.value).toBe('community_feature_enabled')
    expect(fetchFlags).toHaveBeenCalledTimes(1)
  })
})
