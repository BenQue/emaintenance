"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const client_1 = require("@prisma/client");
const NotificationService_1 = require("../services/NotificationService");
const zod_1 = require("zod");
// Validation schemas
const notificationFilterSchema = zod_1.z.object({
    type: zod_1.z.nativeEnum(client_1.NotificationType).optional(),
    isRead: zod_1.z.string().transform(val => val === 'true').optional(),
    workOrderId: zod_1.z.string().optional(),
    page: zod_1.z.string().transform(val => parseInt(val) || 1).optional(),
    limit: zod_1.z.string().transform(val => parseInt(val) || 20).optional(),
});
const supervisorFilterSchema = notificationFilterSchema.extend({
    userId: zod_1.z.string().optional(),
});
class NotificationController {
    constructor(prisma) {
        this.prisma = prisma;
        this.notificationService = new NotificationService_1.NotificationService(prisma);
    }
    async getUserNotifications(req, res) {
        try {
            const filters = notificationFilterSchema.parse(req.query);
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            const result = await this.notificationService.getUserNotifications(userId, filters);
            res.json({
                success: true,
                data: result.notifications,
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: Math.ceil(result.total / result.limit),
                },
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors,
                });
                return;
            }
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get notifications',
            });
        }
    }
    async getNotificationById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            const notification = await this.notificationService.getNotificationById(id, userId);
            if (!notification) {
                res.status(404).json({ error: 'Notification not found' });
                return;
            }
            res.json({
                success: true,
                data: notification,
            });
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get notification',
            });
        }
    }
    async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            const notification = await this.notificationService.markAsRead(id, userId);
            if (!notification) {
                res.status(404).json({ error: 'Notification not found' });
                return;
            }
            res.json({
                success: true,
                data: notification,
                message: 'Notification marked as read',
            });
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to mark notification as read',
            });
        }
    }
    async markAllAsRead(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            const result = await this.notificationService.markAllAsRead(userId);
            res.json({
                success: true,
                data: result,
                message: `${result.count} notifications marked as read`,
            });
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to mark all notifications as read',
            });
        }
    }
    async getUserStats(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            const stats = await this.notificationService.getUserStats(userId);
            res.json({
                success: true,
                data: stats,
            });
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get notification stats',
            });
        }
    }
    async getAllNotifications(req, res) {
        try {
            const filters = supervisorFilterSchema.parse(req.query);
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }
            const result = await this.notificationService.getNotificationsForSupervisor(filters, userId);
            res.json({
                success: true,
                data: result.notifications,
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: Math.ceil(result.total / result.limit),
                },
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors,
                });
                return;
            }
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get all notifications',
            });
        }
    }
}
exports.NotificationController = NotificationController;
