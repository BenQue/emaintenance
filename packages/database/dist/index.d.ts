import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export * from '@prisma/client';
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
//# sourceMappingURL=index.d.ts.map