import type { PrismaClient, FeatureFlag } from '@prisma/client'

export class FeatureFlagVersionConflictError extends Error {}
export class FeatureFlagNotFoundError extends Error {}

export class FeatureFlagRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listFeatureFlags(): Promise<FeatureFlag[]> {
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } })
  }

  findFeatureFlagByKey(key: string): Promise<FeatureFlag | null> {
    return this.prisma.featureFlag.findUnique({ where: { key } })
  }

  async updateFeatureFlag(
    key: string,
    enabled: boolean,
    expectedVersion: number,
    updatedByAdminId: string,
  ): Promise<FeatureFlag> {
    const result = await this.prisma.featureFlag.updateMany({
      where: { key, version: expectedVersion },
      data: { enabled, version: { increment: 1 }, updatedByAdminId },
    })

    if (result.count === 0) {
      const current = await this.prisma.featureFlag.findUnique({ where: { key } })
      if (!current) {
        throw new FeatureFlagNotFoundError()
      }
      throw new FeatureFlagVersionConflictError()
    }

    const updated = await this.prisma.featureFlag.findUnique({ where: { key } })
    if (!updated) {
      throw new FeatureFlagNotFoundError()
    }
    return updated
  }
}
