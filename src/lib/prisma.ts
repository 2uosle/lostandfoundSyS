import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Performance optimizations
  datasourceUrl: process.env.DATABASE_URL,
})

// Enable connection pooling
if (process.env.NODE_ENV === 'production') {
  prisma.$connect()
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma