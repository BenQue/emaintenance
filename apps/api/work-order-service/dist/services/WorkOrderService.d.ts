import { PrismaClient } from '@emaintanance/database';
import { CreateWorkOrderRequest, UpdateWorkOrderRequest, WorkOrderWithRelations, WorkOrderFilters, PaginatedWorkOrders, UpdateWorkOrderStatusRequest, WorkOrderStatusHistoryItem, WorkOrderWithStatusHistory, CreateResolutionRecordRequest, ResolutionRecordResponse, WorkOrderWithResolution, AssetMaintenanceHistory } from '../types/work-order';
export declare class WorkOrderService {
    private prisma;
    private workOrderRepository;
    private assignmentRuleService;
    private notificationService;
    constructor(prisma: PrismaClient);
    createWorkOrder(data: CreateWorkOrderRequest, createdById: string): Promise<WorkOrderWithRelations>;
    getWorkOrderById(id: string): Promise<WorkOrderWithRelations | null>;
    getWorkOrders(filters?: WorkOrderFilters, page?: number, limit?: number): Promise<PaginatedWorkOrders>;
    updateWorkOrder(id: string, data: UpdateWorkOrderRequest, userId: string): Promise<WorkOrderWithRelations | null>;
    deleteWorkOrder(id: string, userId: string): Promise<boolean>;
    assignWorkOrder(id: string, assignedToId: string, assignedById: string): Promise<WorkOrderWithRelations | null>;
    getWorkOrderStatistics(filters?: WorkOrderFilters): Promise<{
        total: number;
        byStatus: Record<string, number>;
        byPriority: Record<string, number>;
        averageResolutionTime: number | null;
    }>;
    getUserWorkOrders(userId: string, type?: 'created' | 'assigned', page?: number, limit?: number): Promise<PaginatedWorkOrders>;
    uploadAttachment(workOrderId: string, filePath: string, userId: string): Promise<WorkOrderWithRelations | null>;
    removeAttachment(workOrderId: string, filePath: string, userId: string): Promise<WorkOrderWithRelations | null>;
    updateWorkOrderStatus(id: string, statusUpdate: UpdateWorkOrderStatusRequest, userId: string): Promise<WorkOrderWithRelations | null>;
    getWorkOrderWithStatusHistory(id: string): Promise<WorkOrderWithStatusHistory | null>;
    getWorkOrderStatusHistory(id: string): Promise<WorkOrderStatusHistoryItem[]>;
    getAssignedWorkOrders(technicianId: string, page?: number, limit?: number): Promise<PaginatedWorkOrders>;
    completeWorkOrder(workOrderId: string, resolutionData: CreateResolutionRecordRequest, userId: string): Promise<WorkOrderWithResolution>;
    getWorkOrderWithResolution(workOrderId: string): Promise<WorkOrderWithResolution | null>;
    getAssetMaintenanceHistory(assetId: string, page?: number, limit?: number): Promise<AssetMaintenanceHistory | null>;
    uploadResolutionPhotos(workOrderId: string, photoPaths: string[], userId: string): Promise<ResolutionRecordResponse | null>;
    private canUserUpdateWorkOrder;
    private applyUpdatePermissions;
    private canUserAccessAttachment;
    private canUserUpdateStatus;
    private isValidStatusTransition;
}
//# sourceMappingURL=WorkOrderService.d.ts.map