"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkOrderController = void 0;
const WorkOrderService_1 = require("../services/WorkOrderService");
const validation_1 = require("../utils/validation");
const errorHandler_1 = require("../utils/errorHandler");
const upload_1 = require("../middleware/upload");
class WorkOrderController {
    workOrderService;
    constructor(prisma) {
        this.workOrderService = new WorkOrderService_1.WorkOrderService(prisma);
    }
    // Create new work order
    createWorkOrder = (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    getWorkOrder = (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { id } = validation_1.IdParamSchema.parse(req.params);
        const workOrder = await this.workOrderService.getWorkOrderById(id);
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
    // Get all work orders with filtering and pagination
    getWorkOrders = (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const queryParams = validation_1.WorkOrderQuerySchema.parse(req.query);
        const filters = {
            status: queryParams.status,
            priority: queryParams.priority,
            assetId: queryParams.assetId,
            createdById: queryParams.createdById,
            assignedToId: queryParams.assignedToId,
            category: queryParams.category,
            startDate: queryParams.startDate,
            endDate: queryParams.endDate,
        };
        const result = await this.workOrderService.getWorkOrders(filters, parseInt(queryParams.page), parseInt(queryParams.limit));
        res.json({
            status: 'success',
            data: result,
        });
    });
    // Update work order
    updateWorkOrder = (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    deleteWorkOrder = (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    assignWorkOrder = (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    getMyWorkOrders = (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    getStatistics = (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    uploadAttachment = (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    removeAttachment = (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    getAssignedWorkOrders = (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    updateWorkOrderStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    getWorkOrderWithHistory = (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { id } = validation_1.IdParamSchema.parse(req.params);
        const workOrder = await this.workOrderService.getWorkOrderWithStatusHistory(id);
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
    // Get work order status history
    getWorkOrderStatusHistory = (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    completeWorkOrder = (0, errorHandler_1.asyncHandler)(async (req, res) => {
        if (!req.user) {
            throw new errorHandler_1.AppError('用户未认证', 401);
        }
        const { id } = validation_1.IdParamSchema.parse(req.params);
        // Validate resolution data
        const { solutionDescription, faultCode, photos } = req.body;
        if (!solutionDescription || !solutionDescription.trim()) {
            throw new errorHandler_1.AppError('解决方案描述不能为空', 400);
        }
        const resolutionData = {
            solutionDescription: solutionDescription.trim(),
            faultCode,
            photos,
        };
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
    getWorkOrderWithResolution = (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    uploadResolutionPhotos = (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    // Get asset maintenance history
    getAssetMaintenanceHistory = (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
}
exports.WorkOrderController = WorkOrderController;
