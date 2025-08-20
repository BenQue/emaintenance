import { PrismaClient } from '@emaintenance/database';
import { NotificationType, UserRole } from '@emaintenance/database';
import { NotificationRepository } from '../repositories/NotificationRepository';
import {
  CreateNotificationRequest,
  NotificationFilter,
  NotificationResponse,
  NotificationStats,
} from '../types/notification';

export class NotificationService {
  private notificationRepository: NotificationRepository;

  constructor(private prisma: PrismaClient) {
    this.notificationRepository = new NotificationRepository(prisma);
  }

  async createNotification(data: CreateNotificationRequest): Promise<NotificationResponse> {
    // Verify target user exists and is active
    await this.verifyUser(data.userId);

    return this.notificationRepository.create(data);
  }

  async createWorkOrderAssignmentNotification(
    workOrderId: string,
    assignedToId: string,
    workOrderTitle: string
  ): Promise<NotificationResponse> {
    const notificationData: CreateNotificationRequest = {
      userId: assignedToId,
      type: NotificationType.WORK_ORDER_ASSIGNED,
      title: '新工单分配',
      message: `您已被分配新的工单: ${workOrderTitle}`,
      workOrderId,
    };

    return this.createNotification(notificationData);
  }

  async createWorkOrderUpdateNotification(
    workOrderId: string,
    assignedToId: string,
    workOrderTitle: string,
    updateMessage: string
  ): Promise<NotificationResponse> {
    const notificationData: CreateNotificationRequest = {
      userId: assignedToId,
      type: NotificationType.WORK_ORDER_UPDATED,
      title: '工单状态更新',
      message: `工单 "${workOrderTitle}" ${updateMessage}`,
      workOrderId,
    };

    return this.createNotification(notificationData);
  }

  async createWorkOrderStatusChangeNotification(
    workOrderId: string,
    fromStatus: string,
    toStatus: string,
    workOrderTitle: string
  ): Promise<void> {
    // Get all supervisors and admins to notify about status changes
    const supervisors = await this.prisma.user.findMany({
      where: {
        role: { in: ['SUPERVISOR', 'ADMIN'] },
        isActive: true,
      },
      select: { id: true },
    });

    // Create notifications for all supervisors
    const notifications = supervisors.map(supervisor => ({
      userId: supervisor.id,
      type: NotificationType.WORK_ORDER_UPDATED,
      title: '工单状态变更',
      message: `工单 "${workOrderTitle}" 状态从 ${fromStatus} 更新为 ${toStatus}`,
      workOrderId,
    }));

    // Create all notifications
    for (const notification of notifications) {
      try {
        await this.createNotification(notification);
      } catch (error) {
        console.warn(`Failed to create notification for supervisor ${notification.userId}:`, error);
      }
    }
  }

  async getUserNotifications(
    userId: string,
    filter: Omit<NotificationFilter, 'userId'>
  ): Promise<{
    notifications: NotificationResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Users can only access their own notifications
    const fullFilter: NotificationFilter = { ...filter, userId };
    return this.notificationRepository.findMany(fullFilter);
  }

  async getNotificationById(id: string, userId: string): Promise<NotificationResponse | null> {
    const notification = await this.notificationRepository.findById(id);
    
    // Verify user can only access their own notifications
    if (notification && notification.userId !== userId) {
      throw new Error('Access denied: Cannot access other users\' notifications');
    }

    return notification;
  }

  async markAsRead(id: string, userId: string): Promise<NotificationResponse | null> {
    return this.notificationRepository.markAsRead(id, userId);
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepository.markAllAsRead(userId);
    return { count };
  }

  async getUserStats(userId: string): Promise<NotificationStats> {
    return this.notificationRepository.getUserStats(userId);
  }

  async getNotificationsForSupervisor(
    filter: NotificationFilter,
    supervisorId: string
  ): Promise<{
    notifications: NotificationResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Verify supervisor permissions
    await this.verifySupervisorPermissions(supervisorId);

    return this.notificationRepository.findMany(filter);
  }

  async cleanupOldNotifications(daysOld: number = 30): Promise<{ deleted: number }> {
    const deleted = await this.notificationRepository.deleteOldNotifications(daysOld);
    return { deleted };
  }

  private async verifyUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });

    if (!user || !user.isActive) {
      throw new Error('Target user not found or inactive');
    }
  }

  private async verifySupervisorPermissions(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    if (user.role !== UserRole.SUPERVISOR && user.role !== UserRole.ADMIN) {
      throw new Error('Access denied: Requires supervisor or admin role');
    }
  }
}