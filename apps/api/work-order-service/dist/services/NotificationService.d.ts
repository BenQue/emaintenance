import { PrismaClient } from '@prisma/client';
import { CreateNotificationRequest, NotificationFilter, NotificationResponse, NotificationStats } from '../types/notification';
export declare class NotificationService {
    private prisma;
    private notificationRepository;
    constructor(prisma: PrismaClient);
    createNotification(data: CreateNotificationRequest): Promise<NotificationResponse>;
    createWorkOrderAssignmentNotification(workOrderId: string, assignedToId: string, workOrderTitle: string): Promise<NotificationResponse>;
    createWorkOrderUpdateNotification(workOrderId: string, assignedToId: string, workOrderTitle: string, updateMessage: string): Promise<NotificationResponse>;
    createWorkOrderStatusChangeNotification(workOrderId: string, fromStatus: string, toStatus: string, workOrderTitle: string): Promise<void>;
    getUserNotifications(userId: string, filter: Omit<NotificationFilter, 'userId'>): Promise<{
        notifications: NotificationResponse[];
        total: number;
        page: number;
        limit: number;
    }>;
    getNotificationById(id: string, userId: string): Promise<NotificationResponse | null>;
    markAsRead(id: string, userId: string): Promise<NotificationResponse | null>;
    markAllAsRead(userId: string): Promise<{
        count: number;
    }>;
    getUserStats(userId: string): Promise<NotificationStats>;
    getNotificationsForSupervisor(filter: NotificationFilter, supervisorId: string): Promise<{
        notifications: NotificationResponse[];
        total: number;
        page: number;
        limit: number;
    }>;
    cleanupOldNotifications(daysOld?: number): Promise<{
        deleted: number;
    }>;
    private verifyUser;
    private verifySupervisorPermissions;
}
//# sourceMappingURL=NotificationService.d.ts.map