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
    (req, res) => workOrderController.createWorkOrder(req, res)
  );

  router.get('/', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    (req, res) => workOrderController.getWorkOrders(req, res)
  );

  router.get('/my', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    (req, res) => workOrderController.getMyWorkOrders(req, res)
  );

  router.get('/assigned', 
    authorize(UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    (req, res) => workOrderController.getAssignedWorkOrders(req, res)
  );

  router.get('/:id', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    (req, res) => workOrderController.getWorkOrderById(req, res)
  );

  router.put('/:id', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    (req, res) => workOrderController.updateWorkOrder(req, res)
  );

  router.delete('/:id', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    (req, res) => workOrderController.deleteWorkOrder(req, res)
  );

  // Work order assignment routes
  router.post('/:id/assign', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    (req, res) => workOrderController.assignWorkOrder(req, res)
  );

  router.post('/:id/status', 
    authorize(UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    (req, res) => workOrderController.updateWorkOrderStatus(req, res)
  );

  // Work order statistics and KPI routes
  router.get('/statistics/overview', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    (req, res) => workOrderController.getWorkOrderStatistics(req, res)
  );

  router.get('/filter-options', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    (req, res) => workOrderController.getFilterOptions(req, res)
  );

  router.get('/kpi/mttr', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    (req, res) => workOrderController.getMTTRKPI(req, res)
  );

  router.get('/kpi/completion-rate', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    (req, res) => workOrderController.getCompletionRateKPI(req, res)
  );

  // Export routes
  router.get('/export/csv', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    (req, res) => workOrderController.exportWorkOrdersCSV(req, res)
  );

  // Asset maintenance history
  router.get('/asset/:assetId/maintenance-history', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    (req, res) => workOrderController.getAssetMaintenanceHistory(req, res)
  );

  // Photo upload routes
  router.post('/:id/photos', 
    authorize(UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    (req, res) => workOrderController.uploadWorkOrderPhotos(req, res)
  );

  router.get('/:id/photos', 
    authorize(UserRole.EMPLOYEE, UserRole.TECHNICIAN, UserRole.SUPERVISOR, UserRole.ADMIN), 
    checkWorkOrderAccess(prisma),
    (req, res) => workOrderController.getWorkOrderPhotos(req, res)
  );

  return router;
};

export default router;