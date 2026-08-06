// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { listAdminAccounts } from '../../server/admin/use-cases/list-admin-accounts'
import type { AdminRepository } from '../../server/admin/repository/admin-repository'

describe('listAdminAccounts', () => {
  it('returns whatever the repository returns', async () => {
    const accounts = [
      { id: 'a1', email: 'a@example.com', role: 'ADMIN', status: 'ACTIVE' },
      { id: 'a2', email: 'b@example.com', role: 'SUPER_ADMIN', status: 'ACTIVE' },
    ]
    const adminRepository = {
      listAdminAccounts: vi.fn().mockResolvedValue(accounts),
    } as unknown as AdminRepository

    const result = await listAdminAccounts({ adminRepository })

    expect(result).toEqual(accounts)
    expect(adminRepository.listAdminAccounts).toHaveBeenCalled()
  })
})
