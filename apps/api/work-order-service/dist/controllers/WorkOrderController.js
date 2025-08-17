"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkOrderController = void 0;
const WorkOrderService_1 = require("../services/WorkOrderService");
const validation_1 = require("../utils/validation");
const errorHandler_1 = require("../utils/errorHandler");
const upload_1 = require("../middleware/upload");
const PhotoStorageService_1 = require("../services/PhotoStorageService");
class WorkOrderController {
    constructor(prisma) {
        // Create new work order
        this.createWorkOrder = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            // Validate request body
            const validatedData = validation_1.CreateWorkOrderSchema.parse(req.body);
            // Create work order
            const workOrder = await this.workOrderService.createWorkOrder(validatedData, req.user.id);
            res.status(201).json({
                status: 'success',
                message: '工单创建成功',
                data: {
                    workOrder,
                },
            });
        });
        // Get work order by ID
        this.getWorkOrder = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { id } = validation_1.IdParamSchema.parse(req.params);
            console.log(`[DEBUG] WorkOrderController.getWorkOrder: Fetching work order ID: ${id}`);
            const workOrder = await this.workOrderService.getWorkOrderById(id);
            if (!workOrder) {
                console.log(`[WARNING] WorkOrderController.getWorkOrder: Work order not found for ID: ${id}`);
                throw new errorHandler_1.AppError('工单不存在', 404);
            }
            console.log(`[DEBUG] WorkOrderController.getWorkOrder: Successfully retrieved work order "${workOrder.title}" with asset data:`, {
                assetId: workOrder.asset?.id,
                assetName: workOrder.asset?.name,
                assetCode: workOrder.asset?.assetCode,
            });
            res.json({
                status: 'success',
                data: {
                    workOrder,
                },
            });
        });
        // Get all work orders with filtering and pagination
        this.getWorkOrders = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const queryParams = validation_1.WorkOrderQuerySchema.parse(req.query);
            // Handle backward compatibility for ACTIVE status
            let statusFilter = queryParams.status;
            if (queryParams.status === 'ACTIVE') {
                statusFilter = 'NOT_COMPLETED';
            }
            const filters = {
                status: statusFilter,
                priority: queryParams.priority,
                assetId: queryParams.assetId,
                createdById: queryParams.createdById,
                assignedToId: queryParams.assignedToId,
                category: queryParams.category,
                startDate: queryParams.startDate,
                endDate: queryParams.endDate,
                search: queryParams.search,
                sortBy: queryParams.sortBy,
                sortOrder: queryParams.sortOrder,
            };
            const result = await this.workOrderService.getWorkOrders(filters, parseInt(queryParams.page), parseInt(queryParams.limit));
            res.json({
                status: 'success',
                data: result,
            });
        });
        // Update work order
        this.updateWorkOrder = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            const { id } = validation_1.IdParamSchema.parse(req.params);
            const validatedData = validation_1.UpdateWorkOrderSchema.parse(req.body);
            const workOrder = await this.workOrderService.updateWorkOrder(id, validatedData, req.user.id);
            if (!workOrder) {
                throw new errorHandler_1.AppError('工单更新失败', 400);
            }
            res.json({
                status: 'success',
                message: '工单更新成功',
                data: {
                    workOrder,
                },
            });
        });
        // Delete work order
        this.deleteWorkOrder = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            const { id } = validation_1.IdParamSchema.parse(req.params);
            const success = await this.workOrderService.deleteWorkOrder(id, req.user.id);
            if (!success) {
                throw new errorHandler_1.AppError('工单删除失败', 400);
            }
            res.status(204).json({
                status: 'success',
                message: '工单删除成功',
            });
        });
        // Assign work order to technician
        this.assignWorkOrder = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            const { id } = validation_1.IdParamSchema.parse(req.params);
            const { assignedToId } = validation_1.AssignWorkOrderSchema.parse(req.body);
            const workOrder = await this.workOrderService.assignWorkOrder(id, assignedToId, req.user.id);
            if (!workOrder) {
                throw new errorHandler_1.AppError('工单分配失败', 400);
            }
            res.json({
                status: 'success',
                message: '工单分配成功',
                data: {
                    workOrder,
                },
            });
        });
        // Get work orders for current user
        this.getMyWorkOrders = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            const { type = 'assigned' } = req.query;
            const queryParams = validation_1.WorkOrderQuerySchema.parse(req.query);
            const result = await this.workOrderService.getUserWorkOrders(req.user.id, type, parseInt(queryParams.page), parseInt(queryParams.limit));
            res.json({
                status: 'success',
                data: result,
            });
        });
        // Get work order statistics
        this.getStatistics = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const queryParams = validation_1.WorkOrderQuerySchema.parse(req.query);
            const filters = {
                startDate: queryParams.startDate,
                endDate: queryParams.endDate,
            };
            const statistics = await this.workOrderService.getWorkOrderStatistics(filters);
            res.json({
                status: 'success',
                data: {
                    statistics,
                },
            });
        });
        // Upload attachment
        this.uploadAttachment = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            const { id } = validation_1.IdParamSchema.parse(req.params);
            if (!req.file) {
                throw new errorHandler_1.AppError('请选择要上传的文件', 400);
            }
            const fileUrl = (0, upload_1.getFileUrl)(req.file.filename);
            const workOrder = await this.workOrderService.uploadAttachment(id, fileUrl, req.user.id);
            if (!workOrder) {
                throw new errorHandler_1.AppError('文件上传失败', 400);
            }
            res.json({
                status: 'success',
                message: '文件上传成功',
                data: {
                    fileUrl,
                    workOrder,
                },
            });
        });
        // Remove attachment
        this.removeAttachment = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            const { id } = validation_1.IdParamSchema.parse(req.params);
            const { fileUrl } = req.body;
            if (!fileUrl) {
                throw new errorHandler_1.AppError('请提供要删除的文件URL', 400);
            }
            const workOrder = await this.workOrderService.removeAttachment(id, fileUrl, req.user.id);
            if (!workOrder) {
                throw new errorHandler_1.AppError('文件删除失败', 400);
            }
            // Delete file from filesystem
            const filename = (0, upload_1.getFilenameFromUrl)(fileUrl);
            (0, upload_1.deleteFile)(filename);
            res.json({
                status: 'success',
                message: '文件删除成功',
                data: {
                    workOrder,
                },
            });
        });
        // Get assigned work orders for current technician
        this.getAssignedWorkOrders = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            const queryParams = validation_1.WorkOrderQuerySchema.parse(req.query);
            const result = await this.workOrderService.getAssignedWorkOrders(req.user.id, parseInt(queryParams.page), parseInt(queryParams.limit));
            res.json({
                status: 'success',
                data: result,
            });
        });
        // Update work order status
        this.updateWorkOrderStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            const { id } = validation_1.IdParamSchema.parse(req.params);
            const validatedData = validation_1.UpdateWorkOrderStatusSchema.parse(req.body);
            const workOrder = await this.workOrderService.updateWorkOrderStatus(id, validatedData, req.user.id);
            if (!workOrder) {
                throw new errorHandler_1.AppError('工单状态更新失败', 400);
            }
            res.json({
                status: 'success',
                message: '工单状态更新成功',
                data: {
                    workOrder,
                },
            });
        });
        // Get work order with status history
        this.getWorkOrderWithHistory = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { id } = validation_1.IdParamSchema.parse(req.params);
            console.log(`[DEBUG] WorkOrderController.getWorkOrderWithHistory: Fetching work order history for ID: ${id}`);
            const workOrder = await this.workOrderService.getWorkOrderWithStatusHistory(id);
            if (!workOrder) {
                console.log(`[WARNING] WorkOrderController.getWorkOrderWithHistory: Work order not found for ID: ${id}`);
                throw new errorHandler_1.AppError('工单不存在', 404);
            }
            console.log(`[DEBUG] WorkOrderController.getWorkOrderWithHistory: Successfully retrieved work order "${workOrder.title}" with ${workOrder.statusHistory?.length || 0} status history entries and asset:`, {
                assetId: workOrder.asset?.id,
                assetName: workOrder.asset?.name,
                hasStatusHistory: !!workOrder.statusHistory,
                statusHistoryCount: workOrder.statusHistory?.length || 0,
            });
            res.json({
                status: 'success',
                data: {
                    workOrder,
                },
            });
        });
        // Get work order status history
        this.getWorkOrderStatusHistory = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { id } = validation_1.IdParamSchema.parse(req.params);
            const statusHistory = await this.workOrderService.getWorkOrderStatusHistory(id);
            res.json({
                status: 'success',
                data: {
                    statusHistory,
                },
            });
        });
        // Complete work order with resolution record
        this.completeWorkOrder = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            const { id } = validation_1.IdParamSchema.parse(req.params);
            // Validate resolution data using schema
            const resolutionData = validation_1.CreateResolutionRecordSchema.parse(req.body);
            const workOrder = await this.workOrderService.completeWorkOrder(id, resolutionData, req.user.id);
            res.json({
                status: 'success',
                message: '工单完成成功',
                data: {
                    workOrder,
                },
            });
        });
        // Get work order with resolution record
        this.getWorkOrderWithResolution = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { id } = validation_1.IdParamSchema.parse(req.params);
            const workOrder = await this.workOrderService.getWorkOrderWithResolution(id);
            if (!workOrder) {
                throw new errorHandler_1.AppError('工单不存在', 404);
            }
            res.json({
                status: 'success',
                data: {
                    workOrder,
                },
            });
        });
        // Upload resolution photos
        this.uploadResolutionPhotos = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            const { id } = validation_1.IdParamSchema.parse(req.params);
            if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
                throw new errorHandler_1.AppError('请选择要上传的图片文件', 400);
            }
            const photoPaths = req.files.map(file => (0, upload_1.getFileUrl)(file.filename));
            const resolutionRecord = await this.workOrderService.uploadResolutionPhotos(id, photoPaths, req.user.id);
            if (!resolutionRecord) {
                throw new errorHandler_1.AppError('图片上传失败', 400);
            }
            res.json({
                status: 'success',
                message: '解决方案图片上传成功',
                data: {
                    resolutionRecord,
                    uploadedPhotos: photoPaths,
                },
            });
        });
        // Upload photos to work order
        this.uploadWorkOrderPhotos = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            const { id } = validation_1.IdParamSchema.parse(req.params);
            if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
                throw new errorHandler_1.AppError('请选择要上传的图片文件', 400);
            }
            // Validate work order access
            await this.validateWorkOrderAccess(id, req.user);
            // Save photos using PhotoStorageService
            const photoRecords = [];
            for (const file of req.files) {
                const photoRecord = await this.photoStorageService.savePhoto(file, id);
                photoRecords.push(photoRecord);
            }
            // Update work order with photo records
            const updatedWorkOrder = await this.workOrderService.uploadWorkOrderPhotos(id, photoRecords, req.user.id);
            if (!updatedWorkOrder) {
                throw new errorHandler_1.AppError('照片上传失败', 400);
            }
            res.json({
                status: 'success',
                message: '工单照片上传成功',
                data: {
                    workOrder: updatedWorkOrder,
                    uploadedPhotos: photoRecords,
                },
            });
        });
        // Get photos for work order
        this.getWorkOrderPhotos = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            const { id } = validation_1.IdParamSchema.parse(req.params);
            // Validate work order access
            await this.validateWorkOrderAccess(id, req.user);
            const photos = await this.workOrderService.getWorkOrderPhotos(id);
            res.json({
                status: 'success',
                data: {
                    photos,
                },
            });
        });
        // Get individual photo file
        this.getWorkOrderPhoto = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            const { id, photoId } = req.params;
            if (!id || !photoId) {
                throw new errorHandler_1.AppError('工单ID和照片ID不能为空', 400);
            }
            // Validate work order access
            await this.validateWorkOrderAccess(id, req.user);
            // Get photo metadata
            const photo = await this.workOrderService.getWorkOrderPhotoById(photoId);
            if (!photo) {
                throw new errorHandler_1.AppError('照片不存在', 404);
            }
            // Get photo file path
            const photoPath = await this.photoStorageService.getPhotoPath(photo.filePath);
            // Set appropriate headers
            res.setHeader('Content-Type', photo.mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${photo.originalName}"`);
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours cache
            res.sendFile(photoPath);
        });
        // Get thumbnail for photo
        this.getWorkOrderPhotoThumbnail = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            const { id, photoId } = req.params;
            if (!id || !photoId) {
                throw new errorHandler_1.AppError('工单ID和照片ID不能为空', 400);
            }
            // Validate work order access
            await this.validateWorkOrderAccess(id, req.user);
            // Get photo metadata
            const photo = await this.workOrderService.getWorkOrderPhotoById(photoId);
            if (!photo || !photo.thumbnailPath) {
                throw new errorHandler_1.AppError('缩略图不存在', 404);
            }
            // Get thumbnail file path
            const thumbnailPath = await this.photoStorageService.getThumbnailPath(photo.thumbnailPath);
            // Set appropriate headers
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Disposition', `inline; filename="thumb_${photo.originalName}"`);
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours cache
            res.sendFile(thumbnailPath);
        });
        // Get asset maintenance history
        this.getAssetMaintenanceHistory = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { assetId } = req.params;
            const queryParams = validation_1.WorkOrderQuerySchema.parse(req.query);
            if (!assetId) {
                throw new errorHandler_1.AppError('资产ID不能为空', 400);
            }
            const maintenanceHistory = await this.workOrderService.getAssetMaintenanceHistory(assetId, parseInt(queryParams.page), parseInt(queryParams.limit));
            if (!maintenanceHistory) {
                throw new errorHandler_1.AppError('资产不存在', 404);
            }
            res.json({
                status: 'success',
                data: {
                    maintenanceHistory,
                },
            });
        });
        // KPI Endpoints
        this.getMTTRStatistics = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const filters = this.parseKPIFilters(req.query);
            const mttrStats = await this.workOrderService.getMTTRStatistics(filters);
            res.json({
                status: 'success',
                data: {
                    mttrStatistics: mttrStats,
                },
            });
        });
        this.getWorkOrderTrends = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const filters = this.parseKPIFilters(req.query);
            const trends = await this.workOrderService.getWorkOrderTrends(filters);
            res.json({
                status: 'success',
                data: {
                    trends,
                },
            });
        });
        // Get filter options for dropdown menus
        this.getFilterOptions = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            // Check if user is supervisor/admin
            if (!['SUPERVISOR', 'ADMIN'].includes(req.user.role)) {
                throw new errorHandler_1.AppError('权限不足：只有主管和管理员可以访问筛选选项', 403);
            }
            try {
                const filterOptions = await this.workOrderService.getFilterOptions();
                res.json({
                    status: 'success',
                    data: filterOptions,
                });
            }
            catch (error) {
                // Add more specific error handling for database issues
                console.error('Error in getFilterOptions:', error);
                throw new errorHandler_1.AppError('获取筛选选项失败：数据库查询错误', 500);
            }
        });
        // Export work orders to CSV
        this.exportWorkOrdersCSV = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            if (!req.user) {
                throw new errorHandler_1.AppError('用户未认证', 401);
            }
            // Check if user is supervisor/admin
            if (!['SUPERVISOR', 'ADMIN'].includes(req.user.role)) {
                throw new errorHandler_1.AppError('权限不足：只有主管和管理员可以导出工单', 403);
            }
            // Validate and sanitize query parameters
            const queryParams = validation_1.CSVExportQuerySchema.parse(req.query);
            // Security: Limit export size to prevent abuse
            const MAX_EXPORT_LIMIT = 10000;
            if (!queryParams.startDate && !queryParams.endDate) {
                // If no date range specified, apply a reasonable default to prevent exporting all data
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                queryParams.startDate = thirtyDaysAgo;
            }
            const filters = {
                status: queryParams.status,
                priority: queryParams.priority,
                assetId: queryParams.assetId,
                createdById: queryParams.createdById,
                assignedToId: queryParams.assignedToId,
                category: queryParams.category,
                startDate: queryParams.startDate,
                endDate: queryParams.endDate,
                search: queryParams.search,
                sortBy: queryParams.sortBy,
                sortOrder: queryParams.sortOrder,
            };
            // Get work orders for CSV export
            const workOrders = await this.workOrderService.getWorkOrdersForCSV(filters);
            if (workOrders.length === 0) {
                throw new errorHandler_1.AppError('没有找到符合条件的工单', 404);
            }
            // Security: Check export size limit
            if (workOrders.length > MAX_EXPORT_LIMIT) {
                throw new errorHandler_1.AppError(`导出数据量过大 (${workOrders.length}条)，请缩小查询范围。最大允许导出${MAX_EXPORT_LIMIT}条记录。`, 400);
            }
            // Generate CSV content
            const csvContent = await this.workOrderService.generateCSVContent(workOrders, queryParams.columns);
            // Audit log: Record export activity
            console.info(`Work order CSV export by user ${req.user.id} (${req.user.role}): ${workOrders.length} records`, {
                userId: req.user.id,
                userRole: req.user.role,
                recordCount: workOrders.length,
                filters: Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== undefined)),
                timestamp: new Date().toISOString(),
            });
            // Set response headers for CSV download
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `work-orders-export-${timestamp}.csv`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Cache-Control', 'no-cache');
            // Add BOM for proper UTF-8 encoding in Excel
            res.write('\uFEFF');
            res.end(csvContent);
        });
        this.workOrderService = new WorkOrderService_1.WorkOrderService(prisma);
        this.photoStorageService = new PhotoStorageService_1.PhotoStorageService();
    }
    /**
     * Helper method to validate work order access permissions
     */
    async validateWorkOrderAccess(workOrderId, user) {
        const workOrder = await this.workOrderService.getWorkOrderById(workOrderId);
        if (!workOrder) {
            throw new errorHandler_1.AppError('工单不存在', 404);
        }
        // Check access permission - only creator, assignee, or SUPERVISOR/ADMIN
        if (workOrder.createdById !== user.id &&
            workOrder.assignedToId !== user.id &&
            !['SUPERVISOR', 'ADMIN'].includes(user.role)) {
            throw new errorHandler_1.AppError('权限不足：无法访问此工单', 403);
        }
        return workOrder;
    }
    parseKPIFilters(query) {
        const filters = {};
        if (query.status)
            filters.status = query.status;
        if (query.priority)
            filters.priority = query.priority;
        if (query.assetId)
            filters.assetId = query.assetId;
        if (query.createdById)
            filters.createdById = query.createdById;
        if (query.assignedToId)
            filters.assignedToId = query.assignedToId;
        if (query.category)
            filters.category = query.category;
        if (query.startDate) {
            filters.startDate = new Date(query.startDate);
        }
        if (query.endDate) {
            filters.endDate = new Date(query.endDate);
        }
        if (query.timeRange && ['week', 'month', 'quarter', 'year'].includes(query.timeRange)) {
            filters.timeRange = query.timeRange;
        }
        if (query.granularity && ['day', 'week', 'month'].includes(query.granularity)) {
            filters.granularity = query.granularity;
        }
        return filters;
    }
}
exports.WorkOrderController = WorkOrderController;
