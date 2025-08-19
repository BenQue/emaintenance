import { PrismaClient } from '@prisma/client';
import { Notification, NotificationType } from '@emaintenance/database';
import {
  CreateNotificationRequest,
  NotificationFilter,
  NotificationResponse,
  NotificationStats,
} from '../types/notification';

export class NotificationRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateNotificationRequest): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.create({
      data,
      include: {
        workOrder: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    return this.formatResponse(notification);
  }

  async findById(id: string): Promise<NotificationResponse | null> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        workOrder: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    return notification ? this.formatResponse(notification) : null;
  }

  async findMany(filter: NotificationFilter): Promise<{
    notifications: NotificationResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, ...whereClause } = filter;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        include: {
          workOrder: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: whereClause }),
    ]);

    return {
      notifications: notifications.map(this.formatResponse),
      total,
      page,
      limit,
    };
  }

  async markAsRead(id: string, userId: string): Promise<NotificationResponse | null> {
    try {
      const notification = await this.prisma.notification.update({
        where: { 
          id,
          userId, // Ensure user can only mark their own notifications as read
        },
        data: { isRead: true },
        include: {
          workOrder: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      });

      return this.formatResponse(notification);
    } catch (error) {
      return null;
    }
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { 
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return result.count;
  }

  async getUserStats(userId: string): Promise<NotificationStats> {
    const [total, unread, byType] = await Promise.all([
      this.prisma.notification.count({
        where: { userId },
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where: { userId },
        _count: { type: true },
      }),
    ]);

    const typeStats = byType.reduce(
      (acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      },
      {} as Record<NotificationType, number>
    );

    // Initialize all notification types with 0 if not present
    const allTypes: NotificationType[] = ['WORK_ORDER_ASSIGNED', 'WORK_ORDER_UPDATED', 'SYSTEM_ALERT'];
    allTypes.forEach(type => {
      if (!(type in typeStats)) {
        typeStats[type] = 0;
      }
    });

    return {
      total,
      unread,
      byType: typeStats,
    };
  }

  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        isRead: true,
      },
    });

    return result.count;
  }

  private formatResponse(notification: Notification & {
    workOrder?: {
      id: string;
      title: string;
      status: string;
    } | null;
  }): NotificationResponse {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      workOrderId: notification.workOrderId || undefined,
      workOrder: notification.workOrder || undefined,
      createdAt: notification.createdAt,
    };
  }
}