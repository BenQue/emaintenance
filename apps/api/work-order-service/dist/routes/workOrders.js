"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("@emaintenance/database");
const WorkOrderController_1 = require("../controllers/WorkOrderController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = (0, express_1.Router)();
const prisma = new database_1.PrismaClient();
const workOrderController = new WorkOrderController_1.WorkOrderController(prisma);
// Strict rate limiter for create/update operations
const isDevelopment = process.env.NODE_ENV === 'development';
const strictLimiter = (0, express_rate_limit_1.default)({
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
router.use(auth_1.authenticate);
// Public routes (authenticated users) - Apply strict rate limiting to creation
router.post('/', strictLimiter, workOrderController.createWorkOrder);
router.get('/my', workOrderController.getMyWorkOrders);
router.get('/assigned', workOrderController.getAssignedWorkOrders);
router.get('/statistics', (0, auth_1.authorize)('SUPERVISOR', 'ADMIN'), workOrderController.getStatistics);
router.get('/filter-options', (0, auth_1.authorize)('SUPERVISOR', 'ADMIN'), workOrderController.getFilterOptions);
router.get('/', workOrderController.getWorkOrders);
// Protected routes (require work order access check)
router.get('/:id', auth_1.checkWorkOrderAccess, workOrderController.getWorkOrder);
router.get('/:id/history', auth_1.checkWorkOrderAccess, workOrderController.getWorkOrderWithHistory);
router.get('/:id/status-history', auth_1.checkWorkOrderAccess, workOrderController.getWorkOrderStatusHistory);
router.put('/:id', strictLimiter, auth_1.checkWorkOrderAccess, workOrderController.updateWorkOrder);
router.put('/:id/status', strictLimiter, auth_1.checkWorkOrderAccess, workOrderController.updateWorkOrderStatus);
router.delete('/:id', strictLimiter, auth_1.checkWorkOrderAccess, workOrderController.deleteWorkOrder);
// File upload routes - Apply strict rate limiting to uploads
router.post('/:id/attachments', strictLimiter, auth_1.checkWorkOrderAccess, upload_1.uploadSingle, workOrderController.uploadAttachment);
router.delete('/:id/attachments', strictLimiter, auth_1.checkWorkOrderAccess, workOrderController.removeAttachment);
// Assignment routes (supervisors and admins only) - Apply strict rate limiting
router.put('/:id/assign', strictLimiter, (0, auth_1.authorize)('SUPERVISOR', 'ADMIN'), workOrderController.assignWorkOrder);
// Work order completion routes - Apply strict rate limiting to completion
router.post('/:id/complete', strictLimiter, auth_1.checkWorkOrderAccess, workOrderController.completeWorkOrder);
router.get('/:id/resolution', auth_1.checkWorkOrderAccess, workOrderController.getWorkOrderWithResolution);
router.post('/:id/photos', strictLimiter, auth_1.checkWorkOrderAccess, upload_1.uploadMultiple, workOrderController.uploadResolutionPhotos);
// Asset maintenance history routes (read-only, use default rate limiting)
router.get('/assets/:assetId/maintenance-history', workOrderController.getAssetMaintenanceHistory);
// Photo management routes - Apply strict rate limiting to photo uploads
router.post('/:id/work-order-photos', strictLimiter, upload_1.uploadPhotos, workOrderController.uploadWorkOrderPhotos);
router.get('/:id/work-order-photos', workOrderController.getWorkOrderPhotos);
router.get('/:id/work-order-photos/:photoId', workOrderController.getWorkOrderPhoto);
router.get('/:id/work-order-photos/:photoId/thumbnail', workOrderController.getWorkOrderPhotoThumbnail);
// KPI routes (supervisors and admins only)
router.get('/kpi/mttr', (0, auth_1.authorize)('SUPERVISOR', 'ADMIN'), workOrderController.getMTTRStatistics);
router.get('/kpi/trends', (0, auth_1.authorize)('SUPERVISOR', 'ADMIN'), workOrderController.getWorkOrderTrends);
// Advanced filtering routes (supervisors and admins only)
router.get('/export', (0, auth_1.authorize)('SUPERVISOR', 'ADMIN'), workOrderController.exportWorkOrdersCSV);
exports.default = router;
