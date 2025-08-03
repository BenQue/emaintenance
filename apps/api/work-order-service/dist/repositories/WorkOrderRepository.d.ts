import { PrismaClient, Priority, WorkOrderStatus } from '@emaintanance/database';
import { CreateWorkOrderRequest, UpdateWorkOrderRequest, WorkOrderWithRelations, WorkOrderFilters, PaginatedWorkOrders } from '../types/work-order';
export declare class WorkOrderRepository {
    private prisma;
    constructor(prisma: PrismaClient);
    create(data: CreateWorkOrderRequest & {
        createdById: string;
    }): Promise<WorkOrderWithRelations>;
    findById(id: string): Promise<WorkOrderWithRelations | null>;
    findMany(filters?: WorkOrderFilters, page?: number, limit?: number): Promise<PaginatedWorkOrders>;
    update(id: string, data: UpdateWorkOrderRequest): Promise<WorkOrderWithRelations | null>;
    delete(id: string): Promise<boolean>;
    getStatistics(filters?: WorkOrderFilters): Promise<{
        total: number;
        byStatus: Record<WorkOrderStatus, number>;
        byPriority: Record<Priority, number>;
        averageResolutionTime: number | null;
    }>;
}
//# sourceMappingURL=WorkOrderRepository.d.ts.map