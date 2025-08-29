import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Export Prisma client types
export * from '@prisma/client';
export type { User, Asset, WorkOrder, Category, Location, FaultCodeMaster, Reason, PriorityLevel } from '@prisma/client';
export { UserRole } from '@prisma/client';


export interface MasterDataCreateInput {
  name: string;
  description?: string;
  isActive?: boolean;
  categoryId?: string;
}

export interface MasterDataListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export default prisma;