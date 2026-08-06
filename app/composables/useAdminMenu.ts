export type AdminRole = 'ADMIN' | 'SUPER_ADMIN'

export interface AdminMenuItem {
  key: string
  label: string
}

const CMS_MENU_ITEMS: AdminMenuItem[] = [
  { key: 'stories', label: 'Truyện & chương' },
  { key: 'moderation', label: 'Moderation' },
  { key: 'analytics', label: 'Analytics' },
]

const SYSTEM_MENU_ITEMS: AdminMenuItem[] = [
  { key: 'system-settings', label: 'System settings' },
  { key: 'feature-flags', label: 'Feature flags' },
  { key: 'admin-accounts', label: 'Quản trị admin' },
  { key: 'abuse-guard', label: 'Abuse Guard' },
]

export function useAdminMenu(role: AdminRole): AdminMenuItem[] {
  if (role === 'SUPER_ADMIN') {
    return [...CMS_MENU_ITEMS, ...SYSTEM_MENU_ITEMS]
  }
  return [...CMS_MENU_ITEMS]
}
