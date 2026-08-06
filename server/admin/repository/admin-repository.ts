import type {
  PrismaClient,
  AdminAccount,
  AdminTotpCredential,
  AdminRole,
  Prisma,
} from '@prisma/client'

export interface CreateAdminSessionInput {
  adminAccountId: string
  tokenHash: string
  expiresAt: Date
}

export interface CreateTotpCredentialInput {
  adminAccountId: string
  secretEncrypted: string
}

export interface CreateAdminAccountInput {
  email: string
  passwordHash: string
  role: AdminRole
}

export interface CreateAuditLogInput {
  adminAccountId: string
  action: string
  targetType: string
  targetId: string
  beforeValue?: Prisma.InputJsonValue
  afterValue?: Prisma.InputJsonValue
}

export class LastActiveSuperAdminError extends Error {}

export class AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByEmail(email: string): Promise<AdminAccount | null> {
    return this.prisma.adminAccount.findUnique({ where: { email } })
  }

  findById(adminAccountId: string): Promise<AdminAccount | null> {
    return this.prisma.adminAccount.findUnique({ where: { id: adminAccountId } })
  }

  createAdminSession(input: CreateAdminSessionInput) {
    return this.prisma.adminSession.create({ data: input })
  }

  findAdminSessionByTokenHash(tokenHash: string) {
    return this.prisma.adminSession.findUnique({ where: { tokenHash } })
  }

  findTotpCredential(adminAccountId: string): Promise<AdminTotpCredential | null> {
    return this.prisma.adminTotpCredential.findUnique({ where: { adminAccountId } })
  }

  upsertTotpCredential(input: CreateTotpCredentialInput): Promise<AdminTotpCredential> {
    return this.prisma.adminTotpCredential.upsert({
      where: { adminAccountId: input.adminAccountId },
      create: input,
      update: { secretEncrypted: input.secretEncrypted, activatedAt: null },
    })
  }

  activateTotpCredential(id: string): Promise<AdminTotpCredential> {
    return this.prisma.adminTotpCredential.update({
      where: { id },
      data: { activatedAt: new Date() },
    })
  }

  findAdminSessionById(id: string) {
    return this.prisma.adminSession.findUnique({ where: { id } })
  }

  markAdminSessionTotpVerified(id: string) {
    return this.prisma.adminSession.update({
      where: { id },
      data: { totpVerifiedAt: new Date() },
    })
  }

  createAdminAccount(input: CreateAdminAccountInput): Promise<AdminAccount> {
    return this.prisma.adminAccount.create({ data: input })
  }

  createAuditLog(input: CreateAuditLogInput) {
    return this.prisma.adminAuditLog.create({ data: input })
  }

  /**
   * Locks every ACTIVE SUPER_ADMIN row (SELECT ... FOR UPDATE) before applying `mutate`,
   * so two concurrent transactions attempting to demote/disable different SUPER_ADMINs
   * cannot both observe "N others remain" and both commit — the second waits for the
   * first's lock to release and re-evaluates against the post-mutation count.
   */
  private async withLastActiveSuperAdminGuard(
    excludeAdminAccountId: string,
    mutate: (tx: PrismaClient) => Promise<void>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const lockedActiveSuperAdmins = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "AdminAccount"
        WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE'
        FOR UPDATE
      `
      const remaining = lockedActiveSuperAdmins.filter((row) => row.id !== excludeAdminAccountId)
      if (remaining.length === 0) {
        throw new LastActiveSuperAdminError()
      }
      await mutate(tx as unknown as PrismaClient)
    })
  }

  async updateAdminAccountRole(
    adminAccountId: string,
    currentRole: AdminRole,
    newRole: AdminRole,
  ): Promise<void> {
    if (currentRole === 'SUPER_ADMIN' && newRole === 'ADMIN') {
      await this.withLastActiveSuperAdminGuard(adminAccountId, async (tx) => {
        await tx.adminAccount.update({ where: { id: adminAccountId }, data: { role: newRole } })
      })
      return
    }
    await this.prisma.adminAccount.update({
      where: { id: adminAccountId },
      data: { role: newRole },
    })
  }

  async disableAdminAccount(adminAccountId: string, currentRole: AdminRole): Promise<void> {
    if (currentRole === 'SUPER_ADMIN') {
      await this.withLastActiveSuperAdminGuard(adminAccountId, async (tx) => {
        await tx.adminAccount.update({
          where: { id: adminAccountId },
          data: { status: 'DISABLED' },
        })
      })
      return
    }
    await this.prisma.adminAccount.update({
      where: { id: adminAccountId },
      data: { status: 'DISABLED' },
    })
  }

  enableAdminAccount(adminAccountId: string): Promise<AdminAccount> {
    return this.prisma.adminAccount.update({
      where: { id: adminAccountId },
      data: { status: 'ACTIVE' },
    })
  }

  listAdminAccounts(): Promise<AdminAccount[]> {
    return this.prisma.adminAccount.findMany({ orderBy: { createdAt: 'asc' } })
  }
}
