import { createPrismaClient } from './client'
import { seedFeatureFlags } from './seed'

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run the seed script')
  }

  const prisma = createPrismaClient(databaseUrl)
  try {
    await seedFeatureFlags(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
