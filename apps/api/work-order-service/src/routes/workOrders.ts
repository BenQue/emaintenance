import express from 'express';
import { PrismaClient, UserRole } from '@emaintenance/database';
import { WorkOrderController } from '../controllers/WorkOrderController';
import { authenticate, authorize, checkWorkOrderAccess } from '../middleware/auth';
import { uploadSingle, uploadMultiple, uploadPhotos } from '../middleware/upload';
import rateLimit from 'express-rate-limit';

const router = express.Router();

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

// Create routes with PrismaClient dependency injection
export const createWorkOrderRoutes = (prisma: PrismaClient) => {
  const workOrderController = new WorkOrderController(prisma);
  
  // All routes require authentication
  router.use(authenticate(prisma));

  // Work order CRUD routes
  router.post('/', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.createWorkOrder
  );

  router.get('/', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.getWorkOrders
  );

  router.get('/my', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.getMyWorkOrders
  );

  router.get('/assigned', 
    authorize(UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.getAssignedWorkOrders
  );

  // Specific routes must come BEFORE parameter routes
  router.get('/filter-options', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.getFilterOptions
  );

  router.get('/statistics/overview', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.getStatistics
  );

  router.get('/kpi/mttr', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.getMTTRStatistics
  );

  router.get('/kpi/completion-rate', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.getWorkOrderTrends
  );

  router.get('/export/csv', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.exportWorkOrdersCSV
  );

  router.get('/:id', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    workOrderController.getWorkOrder
  );

  router.get('/:id/history', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    workOrderController.getWorkOrderWithHistory.bind(workOrderController)
  );

  router.get('/:id/resolution', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    workOrderController.getWorkOrderWithResolution.bind(workOrderController)
  );

  router.put('/:id', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    workOrderController.updateWorkOrder
  );

  router.delete('/:id', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.deleteWorkOrder
  );

  // Work order assignment routes
  router.put('/:id/assign',
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
    workOrderController.assignWorkOrder
  );

  // Self-assignment route for technicians
  router.put('/:id/assign-to-me',
    authorize(UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN),
    workOrderController.assignWorkOrderToSelf
  );

  router.put('/:id/status', 
    authorize(UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    workOrderController.updateWorkOrderStatus
  );

  router.post('/:id/complete',
    authorize(UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN),
    checkWorkOrderAccess(prisma),
    workOrderController.completeWorkOrder
  );

  router.post('/:id/close',
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN),
    checkWorkOrderAccess(prisma),
    workOrderController.closeWorkOrder
  );

  // Routes moved above for correct Express routing order

  // Asset maintenance history
  router.get('/asset/:assetId/maintenance-history', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.getAssetMaintenanceHistory.bind(workOrderController)
  );

  // Alternative route for frontend compatibility (plural form)
  router.get('/assets/:assetId/maintenance-history', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.getAssetMaintenanceHistory.bind(workOrderController)
  );

  // Photo upload routes
  router.post('/:id/photos', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    uploadPhotos,  // 添加照片上传中间件
    workOrderController.uploadWorkOrderPhotos.bind(workOrderController)
  );

  router.get('/:id/photos', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    workOrderController.getWorkOrderPhotos.bind(workOrderController)
  );

  // Alternative route for frontend compatibility
  router.get('/:id/work-order-photos', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    workOrderController.getWorkOrderPhotos.bind(workOrderController)
  );

  router.post('/:id/work-order-photos', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    uploadPhotos,  // 添加照片上传中间件
    workOrderController.uploadWorkOrderPhotos.bind(workOrderController)
  );

  // Individual photo display routes
  router.get('/:id/work-order-photos/:photoId', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    workOrderController.getWorkOrderPhoto.bind(workOrderController)
  );

  router.get('/:id/work-order-photos/:photoId/thumbnail', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    workOrderController.getWorkOrderPhotoThumbnail.bind(workOrderController)
  );

  return router;
};

export default router;