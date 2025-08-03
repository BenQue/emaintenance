"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("@emaintanance/database");
const WorkOrderController_1 = require("../controllers/WorkOrderController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
const prisma = new database_1.PrismaClient();
const workOrderController = new WorkOrderController_1.WorkOrderController(prisma);
// All routes require authentication
router.use(auth_1.authenticate);
// Public routes (authenticated users)
router.post('/', workOrderController.createWorkOrder);
router.get('/my', workOrderController.getMyWorkOrders);
router.get('/assigned', workOrderController.getAssignedWorkOrders);
router.get('/statistics', (0, auth_1.authorize)('SUPERVISOR', 'ADMIN'), workOrderController.getStatistics);
router.get('/', workOrderController.getWorkOrders);
// Protected routes (require work order access check)
router.get('/:id', auth_1.checkWorkOrderAccess, workOrderController.getWorkOrder);
router.get('/:id/history', auth_1.checkWorkOrderAccess, workOrderController.getWorkOrderWithHistory);
router.get('/:id/status-history', auth_1.checkWorkOrderAccess, workOrderController.getWorkOrderStatusHistory);
router.put('/:id', auth_1.checkWorkOrderAccess, workOrderController.updateWorkOrder);
router.put('/:id/status', auth_1.checkWorkOrderAccess, workOrderController.updateWorkOrderStatus);
router.delete('/:id', auth_1.checkWorkOrderAccess, workOrderController.deleteWorkOrder);
// File upload routes
router.post('/:id/attachments', auth_1.checkWorkOrderAccess, upload_1.uploadSingle, workOrderController.uploadAttachment);
router.delete('/:id/attachments', auth_1.checkWorkOrderAccess, workOrderController.removeAttachment);
// Assignment routes (supervisors and admins only)
router.put('/:id/assign', (0, auth_1.authorize)('SUPERVISOR', 'ADMIN'), workOrderController.assignWorkOrder);
// Work order completion routes
router.post('/:id/complete', auth_1.checkWorkOrderAccess, workOrderController.completeWorkOrder);
router.get('/:id/resolution', auth_1.checkWorkOrderAccess, workOrderController.getWorkOrderWithResolution);
router.post('/:id/photos', auth_1.checkWorkOrderAccess, upload_1.uploadMultiple, workOrderController.uploadResolutionPhotos);
// Asset maintenance history routes
router.get('/assets/:assetId/maintenance-history', workOrderController.getAssetMaintenanceHistory);
exports.default = router;
