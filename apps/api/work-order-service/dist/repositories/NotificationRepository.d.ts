import { PrismaClient } from '@prisma/client';
import { CreateNotificationRequest, NotificationFilter, NotificationResponse, NotificationStats } from '../types/notification';
export declare class NotificationRepository {
    private prisma;
    constructor(prisma: PrismaClient);
    create(data: CreateNotificationRequest): Promise<NotificationResponse>;
    findById(id: string): Promise<NotificationResponse | null>;
    findMany(filter: NotificationFilter): Promise<{
        notifications: NotificationResponse[];
        total: number;
        page: number;
        limit: number;
    }>;
    markAsRead(id: string, userId: string): Promise<NotificationResponse | null>;
    markAllAsRead(userId: string): Promise<number>;
    getUserStats(userId: string): Promise<NotificationStats>;
    deleteOldNotifications(daysOld?: number): Promise<number>;
    private formatResponse;
}
//# sourceMappingURL=NotificationRepository.d.ts.map