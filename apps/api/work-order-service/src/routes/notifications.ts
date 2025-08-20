import express from 'express';
import { PrismaClient } from '@emaintenance/database';
import { UserRole } from '@emaintenance/database';
import { NotificationController } from '../controllers/NotificationController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();
const notificationController = new NotificationController(prisma);

// All routes require authentication
router.use(authenticate);

// User notification routes - accessible to all authenticated users
router.get('/my', (req, res) => notificationController.getUserNotifications(req, res));
router.get('/my/stats', (req, res) => notificationController.getUserStats(req, res));
router.put('/my/mark-all-read', (req, res) => notificationController.markAllAsRead(req, res));
router.get('/my/:id', (req, res) => notificationController.getNotificationById(req, res));
router.put('/my/:id/read', (req, res) => notificationController.markAsRead(req, res));

// Supervisor notification routes - accessible to supervisors and admins
router.get('/all', 
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
  (req, res) => notificationController.getAllNotifications(req, res)
);

export default router;