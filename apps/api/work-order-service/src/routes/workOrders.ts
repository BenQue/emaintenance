import { Router } from 'express';
import { PrismaClient } from '@emaintenance/database';
import { WorkOrderController } from '../controllers/WorkOrderController';
import { authenticate, authorize, checkWorkOrderAccess } from '../middleware/auth';
import { uploadSingle, uploadMultiple, uploadPhotos } from '../middleware/upload';
import rateLimit from 'express-rate-limit';

const router = Router();
const prisma = new PrismaClient();
const workOrderController = new WorkOrderController(prisma);

// Strict rate limiter for create/update operations
const isDevelopment = process.env.NODE_ENV === 'development';
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 200 : 50, // Stricter limit for write operations
  message: {
    error: 'Too many create/update requests from this IP, please try again later.',
    retryAfter: Math.ceil(15 * 60 * 1000 / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// All routes require authentication
router.use(authenticate);

// Public routes (authenticated users) - Apply strict rate limiting to creation
router.post('/', strictLimiter, workOrderController.createWorkOrder);
router.get('/my', workOrderController.getMyWorkOrders);
router.get('/assigned', workOrderController.getAssignedWorkOrders);
router.get('/statistics', authorize('SUPERVISOR', 'ADMIN'), workOrderController.getStatistics);
router.get('/filter-options', authorize('SUPERVISOR', 'ADMIN'), workOrderController.getFilterOptions);
router.get('/', workOrderController.getWorkOrders);

// Protected routes (require work order access check)
router.get('/:id', checkWorkOrderAccess, workOrderController.getWorkOrder);
router.get('/:id/history', checkWorkOrderAccess, workOrderController.getWorkOrderWithHistory);
router.get('/:id/status-history', checkWorkOrderAccess, workOrderController.getWorkOrderStatusHistory);
router.put('/:id', strictLimiter, checkWorkOrderAccess, workOrderController.updateWorkOrder);
router.put('/:id/status', strictLimiter, checkWorkOrderAccess, workOrderController.updateWorkOrderStatus);
router.delete('/:id', strictLimiter, checkWorkOrderAccess, workOrderController.deleteWorkOrder);

// File upload routes - Apply strict rate limiting to uploads
router.post('/:id/attachments', strictLimiter, checkWorkOrderAccess, uploadSingle, workOrderController.uploadAttachment);
router.delete('/:id/attachments', strictLimiter, checkWorkOrderAccess, workOrderController.removeAttachment);

// Assignment routes (supervisors and admins only) - Apply strict rate limiting
router.put('/:id/assign', strictLimiter, authorize('SUPERVISOR', 'ADMIN'), workOrderController.assignWorkOrder);

// Work order completion routes - Apply strict rate limiting to completion
router.post('/:id/complete', strictLimiter, checkWorkOrderAccess, workOrderController.completeWorkOrder);
router.get('/:id/resolution', checkWorkOrderAccess, workOrderController.getWorkOrderWithResolution);
router.post('/:id/photos', strictLimiter, checkWorkOrderAccess, uploadMultiple, workOrderController.uploadResolutionPhotos);

// Asset maintenance history routes (read-only, use default rate limiting)
router.get('/assets/:assetId/maintenance-history', workOrderController.getAssetMaintenanceHistory);

// Photo management routes - Apply strict rate limiting to photo uploads
router.post('/:id/work-order-photos', strictLimiter, uploadPhotos, workOrderController.uploadWorkOrderPhotos);
router.get('/:id/work-order-photos', workOrderController.getWorkOrderPhotos);
router.get('/:id/work-order-photos/:photoId', workOrderController.getWorkOrderPhoto);
router.get('/:id/work-order-photos/:photoId/thumbnail', workOrderController.getWorkOrderPhotoThumbnail);

// KPI routes (supervisors and admins only)
router.get('/kpi/mttr', authorize('SUPERVISOR', 'ADMIN'), workOrderController.getMTTRStatistics);
router.get('/kpi/trends', authorize('SUPERVISOR', 'ADMIN'), workOrderController.getWorkOrderTrends);

// Advanced filtering routes (supervisors and admins only)
router.get('/export', authorize('SUPERVISOR', 'ADMIN'), workOrderController.exportWorkOrdersCSV);

export default router;