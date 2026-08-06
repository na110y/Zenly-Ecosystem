import { createPrismaClient } from './client'
import { bootstrapSuperAdmin } from './bootstrap-super-admin'

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run the bootstrap script')
  }

  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL
  const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error(
      'BOOTSTRAP_SUPER_ADMIN_EMAIL and BOOTSTRAP_SUPER_ADMIN_PASSWORD are required to run the bootstrap script',
    )
  }

  const prisma = createPrismaClient(databaseUrl)
  try {
    await bootstrapSuperAdmin(prisma, { email, password })
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
