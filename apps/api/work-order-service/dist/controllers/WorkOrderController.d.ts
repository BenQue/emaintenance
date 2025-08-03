import { Request, Response } from 'express';
import { PrismaClient } from '@emaintanance/database';
export declare class WorkOrderController {
    private workOrderService;
    constructor(prisma: PrismaClient);
    createWorkOrder: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getWorkOrder: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getWorkOrders: (req: Request, res: Response, next: import("express").NextFunction) => void;
    updateWorkOrder: (req: Request, res: Response, next: import("express").NextFunction) => void;
    deleteWorkOrder: (req: Request, res: Response, next: import("express").NextFunction) => void;
    assignWorkOrder: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getMyWorkOrders: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getStatistics: (req: Request, res: Response, next: import("express").NextFunction) => void;
    uploadAttachment: (req: Request, res: Response, next: import("express").NextFunction) => void;
    removeAttachment: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getAssignedWorkOrders: (req: Request, res: Response, next: import("express").NextFunction) => void;
    updateWorkOrderStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getWorkOrderWithHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getWorkOrderStatusHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
    completeWorkOrder: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getWorkOrderWithResolution: (req: Request, res: Response, next: import("express").NextFunction) => void;
    uploadResolutionPhotos: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getAssetMaintenanceHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=WorkOrderController.d.ts.map