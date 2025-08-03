import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
export declare class NotificationController {
    private prisma;
    private notificationService;
    constructor(prisma: PrismaClient);
    getUserNotifications(req: Request, res: Response): Promise<void>;
    getNotificationById(req: Request, res: Response): Promise<void>;
    markAsRead(req: Request, res: Response): Promise<void>;
    markAllAsRead(req: Request, res: Response): Promise<void>;
    getUserStats(req: Request, res: Response): Promise<void>;
    getAllNotifications(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=NotificationController.d.ts.map