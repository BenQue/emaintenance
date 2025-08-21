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

  router.get('/:id', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    workOrderController.getWorkOrder
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
  router.post('/:id/assign', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.assignWorkOrder
  );

  router.post('/:id/status', 
    authorize(UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    workOrderController.updateWorkOrderStatus
  );

  // Work order statistics and KPI routes
  router.get('/statistics/overview', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.getStatistics
  );

  router.get('/filter-options', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.getFilterOptions
  );

  router.get('/kpi/mttr', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.getMTTRStatistics
  );

  router.get('/kpi/completion-rate', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.getWorkOrderTrends
  );

  // Export routes
  router.get('/export/csv', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.exportWorkOrdersCSV
  );

  // Asset maintenance history
  router.get('/asset/:assetId/maintenance-history', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    workOrderController.getAssetMaintenanceHistory
  );

  // Photo upload routes
  router.post('/:id/photos', 
    authorize(UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    workOrderController.uploadWorkOrderPhotos
  );

  router.get('/:id/photos', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    workOrderController.getWorkOrderPhotos
  );

  return router;
};

export default router;