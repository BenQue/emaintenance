import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { NotificationType } from '@emaintenance/database';
import { NotificationService } from '../services/NotificationService';
import { z } from 'zod';

// Validation schemas
const notificationFilterSchema = z.object({
  type: z.nativeEnum(NotificationType).optional(),
  isRead: z.string().transform(val => val === 'true').optional(),
  workOrderId: z.string().optional(),
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => parseInt(val) || 20).optional(),
});

const supervisorFilterSchema = notificationFilterSchema.extend({
  userId: z.string().optional(),
});

export class NotificationController {
  private notificationService: NotificationService;

  constructor(private prisma: PrismaClient) {
    this.notificationService = new NotificationService(prisma);
  }

  async getUserNotifications(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.issues,
        });
        return;
      }

      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get notifications',
      });
    }
  }

  async getNotificationById(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get notification',
      });
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to mark notification as read',
      });
    }
  }

  async markAllAsRead(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to mark all notifications as read',
      });
    }
  }

  async getUserStats(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get notification stats',
      });
    }
  }

  async getAllNotifications(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.issues,
        });
        return;
      }

      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get all notifications',
      });
    }
  }
}