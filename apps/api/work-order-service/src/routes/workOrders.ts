import { Router } from 'express';
import { PrismaClient } from '@emaintanance/database';
import { WorkOrderController } from '../controllers/WorkOrderController';
import { authenticate, authorize, checkWorkOrderAccess } from '../middleware/auth';
import { uploadSingle, uploadMultiple } from '../middleware/upload';

const router = Router();
const prisma = new PrismaClient();
const workOrderController = new WorkOrderController(prisma);

// All routes require authentication
router.use(authenticate);

// Public routes (authenticated users)
router.post('/', workOrderController.createWorkOrder);
router.get('/my', workOrderController.getMyWorkOrders);
router.get('/assigned', workOrderController.getAssignedWorkOrders);
router.get('/statistics', authorize('SUPERVISOR', 'ADMIN'), workOrderController.getStatistics);
router.get('/', workOrderController.getWorkOrders);

// Protected routes (require work order access check)
router.get('/:id', checkWorkOrderAccess, workOrderController.getWorkOrder);
router.get('/:id/history', checkWorkOrderAccess, workOrderController.getWorkOrderWithHistory);
router.get('/:id/status-history', checkWorkOrderAccess, workOrderController.getWorkOrderStatusHistory);
router.put('/:id', checkWorkOrderAccess, workOrderController.updateWorkOrder);
router.put('/:id/status', checkWorkOrderAccess, workOrderController.updateWorkOrderStatus);
router.delete('/:id', checkWorkOrderAccess, workOrderController.deleteWorkOrder);

// File upload routes
router.post('/:id/attachments', checkWorkOrderAccess, uploadSingle, workOrderController.uploadAttachment);
router.delete('/:id/attachments', checkWorkOrderAccess, workOrderController.removeAttachment);

// Assignment routes (supervisors and admins only)
router.put('/:id/assign', authorize('SUPERVISOR', 'ADMIN'), workOrderController.assignWorkOrder);

// Work order completion routes
router.post('/:id/complete', checkWorkOrderAccess, workOrderController.completeWorkOrder);
router.get('/:id/resolution', checkWorkOrderAccess, workOrderController.getWorkOrderWithResolution);
router.post('/:id/photos', checkWorkOrderAccess, uploadMultiple, workOrderController.uploadResolutionPhotos);

// Asset maintenance history routes
router.get('/assets/:assetId/maintenance-history', workOrderController.getAssetMaintenanceHistory);

// KPI routes (supervisors and admins only)
router.get('/kpi/mttr', authorize('SUPERVISOR', 'ADMIN'), workOrderController.getMTTRStatistics);
router.get('/kpi/trends', authorize('SUPERVISOR', 'ADMIN'), workOrderController.getWorkOrderTrends);

export default router;