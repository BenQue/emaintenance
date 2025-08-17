"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const database_1 = require("@emaintenance/database");
const NotificationRepository_1 = require("../repositories/NotificationRepository");
class NotificationService {
    constructor(prisma) {
        this.prisma = prisma;
        this.notificationRepository = new NotificationRepository_1.NotificationRepository(prisma);
    }
    async createNotification(data) {
        // Verify target user exists and is active
        await this.verifyUser(data.userId);
        return this.notificationRepository.create(data);
    }
    async createWorkOrderAssignmentNotification(workOrderId, assignedToId, workOrderTitle) {
        const notificationData = {
            userId: assignedToId,
            type: database_1.NotificationType.WORK_ORDER_ASSIGNED,
            title: '新工单分配',
            message: `您已被分配新的工单: ${workOrderTitle}`,
            workOrderId,
        };
        return this.createNotification(notificationData);
    }
    async createWorkOrderUpdateNotification(workOrderId, assignedToId, workOrderTitle, updateMessage) {
        const notificationData = {
            userId: assignedToId,
            type: database_1.NotificationType.WORK_ORDER_UPDATED,
            title: '工单状态更新',
            message: `工单 "${workOrderTitle}" ${updateMessage}`,
            workOrderId,
        };
        return this.createNotification(notificationData);
    }
    async createWorkOrderStatusChangeNotification(workOrderId, fromStatus, toStatus, workOrderTitle) {
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
            type: database_1.NotificationType.WORK_ORDER_UPDATED,
            title: '工单状态变更',
            message: `工单 "${workOrderTitle}" 状态从 ${fromStatus} 更新为 ${toStatus}`,
            workOrderId,
        }));
        // Create all notifications
        for (const notification of notifications) {
            try {
                await this.createNotification(notification);
            }
            catch (error) {
                console.warn(`Failed to create notification for supervisor ${notification.userId}:`, error);
            }
        }
    }
    async getUserNotifications(userId, filter) {
        // Users can only access their own notifications
        const fullFilter = { ...filter, userId };
        return this.notificationRepository.findMany(fullFilter);
    }
    async getNotificationById(id, userId) {
        const notification = await this.notificationRepository.findById(id);
        // Verify user can only access their own notifications
        if (notification && notification.userId !== userId) {
            throw new Error('Access denied: Cannot access other users\' notifications');
        }
        return notification;
    }
    async markAsRead(id, userId) {
        return this.notificationRepository.markAsRead(id, userId);
    }
    async markAllAsRead(userId) {
        const count = await this.notificationRepository.markAllAsRead(userId);
        return { count };
    }
    async getUserStats(userId) {
        return this.notificationRepository.getUserStats(userId);
    }
    async getNotificationsForSupervisor(filter, supervisorId) {
        // Verify supervisor permissions
        await this.verifySupervisorPermissions(supervisorId);
        return this.notificationRepository.findMany(filter);
    }
    async cleanupOldNotifications(daysOld = 30) {
        const deleted = await this.notificationRepository.deleteOldNotifications(daysOld);
        return { deleted };
    }
    async verifyUser(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isActive: true },
        });
        if (!user || !user.isActive) {
            throw new Error('Target user not found or inactive');
        }
    }
    async verifySupervisorPermissions(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, isActive: true },
        });
        if (!user || !user.isActive) {
            throw new Error('User not found or inactive');
        }
        if (user.role !== database_1.UserRole.SUPERVISOR && user.role !== database_1.UserRole.ADMIN) {
            throw new Error('Access denied: Requires supervisor or admin role');
        }
    }
}
exports.NotificationService = NotificationService;
