// Augment Prisma Client types to ensure ActivityLog is recognized
import { PrismaClient } from '@prisma/client'

declare module '@prisma/client' {
  export interface PrismaClient {
    activityLog: {
      create: (args: any) => Promise<any>
      findMany: (args?: any) => Promise<any[]>
      findUnique: (args: any) => Promise<any>
      update: (args: any) => Promise<any>
      delete: (args: any) => Promise<any>
    }
  }
}

