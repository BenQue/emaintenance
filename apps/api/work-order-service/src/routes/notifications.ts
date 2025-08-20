import express from 'express';
import { PrismaClient } from '@emaintenance/database';
import { UserRole } from '@emaintenance/database';
import { NotificationController } from '../controllers/NotificationController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Create routes with PrismaClient dependency injection
export const createNotificationRoutes = (prisma: PrismaClient) => {
  const notificationController = new NotificationController(prisma);
  
  // All routes require authentication
  router.use(authenticate(prisma));

  // User notification routes - accessible to all authenticated users
  router.get('/my', notificationController.getUserNotifications);
  router.get('/my/stats', notificationController.getUserStats);
  router.put('/my/mark-all-read', notificationController.markAllAsRead);
  router.get('/my/:id', notificationController.getNotificationById);
  router.put('/my/:id/read', notificationController.markAsRead);

  // Supervisor notification routes - accessible to supervisors and admins
  router.get('/all', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    notificationController.getAllNotifications
  );

  return router;
};

export default router;