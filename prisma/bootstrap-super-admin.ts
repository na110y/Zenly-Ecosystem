import { hash } from 'argon2'
import type { PrismaClient } from '@prisma/client'

export interface BootstrapSuperAdminInput {
  email: string
  password: string
}

export async function bootstrapSuperAdmin(
  prisma: PrismaClient,
  input: BootstrapSuperAdminInput,
): Promise<void> {
  const existingCount = await prisma.adminAccount.count()
  if (existingCount > 0) {
    return
  }

  const passwordHash = await hash(input.password)
  await prisma.adminAccount.create({
    data: {
      email: input.email,
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  })
}
