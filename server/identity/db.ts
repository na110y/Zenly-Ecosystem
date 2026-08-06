import type { PrismaClient } from '@prisma/client'
import { createPrismaClient } from '../../prisma/client'

let client: PrismaClient | undefined

export function getPrismaClient(databaseUrl: string): PrismaClient {
  if (!client) {
    client = createPrismaClient(databaseUrl)
  }
  return client
}
