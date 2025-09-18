import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Only create Prisma client if DATABASE_URL is available (prevents build errors)
export const prisma = process.env.DATABASE_URL 
  ? (globalForPrisma.prisma ?? new PrismaClient())
  : null as any;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;