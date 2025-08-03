import { Router } from 'express';
import { PrismaClient } from '@emaintanance/database';
import { WorkOrderController } from '../controllers/WorkOrderController';
import { authenticate, authorize, checkWorkOrderAccess } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';

const router = Router();
const prisma = new PrismaClient();
const workOrderController = new WorkOrderController(prisma);

// All routes require authentication
router.use(authenticate);

// Public routes (authenticated users)
router.post('/', workOrderController.createWorkOrder);
router.get('/my', workOrderController.getMyWorkOrders);
router.get('/statistics', authorize('SUPERVISOR', 'ADMIN'), workOrderController.getStatistics);
router.get('/', workOrderController.getWorkOrders);

// Protected routes (require work order access check)
router.get('/:id', checkWorkOrderAccess, workOrderController.getWorkOrder);
router.put('/:id', checkWorkOrderAccess, workOrderController.updateWorkOrder);
router.delete('/:id', checkWorkOrderAccess, workOrderController.deleteWorkOrder);

// File upload routes
router.post('/:id/attachments', checkWorkOrderAccess, uploadSingle, workOrderController.uploadAttachment);
router.delete('/:id/attachments', checkWorkOrderAccess, workOrderController.removeAttachment);

// Assignment routes (supervisors and admins only)
router.put('/:id/assign', authorize('SUPERVISOR', 'ADMIN'), workOrderController.assignWorkOrder);

export default router;