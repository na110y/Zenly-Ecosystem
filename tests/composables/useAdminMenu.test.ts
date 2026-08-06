import { describe, it, expect } from 'vitest'
import { useAdminMenu } from '../../app/composables/useAdminMenu'

describe('useAdminMenu', () => {
  it('shows only CMS items for ADMIN', () => {
    const items = useAdminMenu('ADMIN')
    const keys = items.map((item) => item.key)

    expect(keys).toContain('stories')
    expect(keys).toContain('moderation')
    expect(keys).toContain('analytics')
    expect(keys).not.toContain('system-settings')
    expect(keys).not.toContain('feature-flags')
    expect(keys).not.toContain('admin-accounts')
    expect(keys).not.toContain('abuse-guard')
  })

  it('shows both CMS and System nav items for SUPER_ADMIN', () => {
    const items = useAdminMenu('SUPER_ADMIN')
    const keys = items.map((item) => item.key)

    expect(keys).toContain('stories')
    expect(keys).toContain('system-settings')
    expect(keys).toContain('feature-flags')
    expect(keys).toContain('admin-accounts')
    expect(keys).toContain('abuse-guard')
  })

  it('never mutates the underlying menu list between calls', () => {
    const first = useAdminMenu('SUPER_ADMIN')
    first.push({ key: 'injected', label: 'Injected' })

    const second = useAdminMenu('SUPER_ADMIN')
    expect(second.map((item) => item.key)).not.toContain('injected')
  })
})
