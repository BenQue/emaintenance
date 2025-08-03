import { Request, Response } from 'express';
import { PrismaClient } from '@emaintanance/database';
import { WorkOrderService } from '../services/WorkOrderService';
import { 
  CreateWorkOrderSchema, 
  UpdateWorkOrderSchema, 
  WorkOrderQuerySchema,
  AssignWorkOrderSchema,
  UpdateWorkOrderStatusSchema,
  IdParamSchema,
  CreateResolutionRecordSchema,
  CSVExportQuerySchema
} from '../utils/validation';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { getFileUrl, getFilenameFromUrl, deleteFile } from '../middleware/upload';

export class WorkOrderController {
  private workOrderService: WorkOrderService;

  constructor(prisma: PrismaClient) {
    this.workOrderService = new WorkOrderService(prisma);
  }

  // Create new work order
  createWorkOrder = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    // Validate request body
    const validatedData = CreateWorkOrderSchema.parse(req.body);

    // Create work order
    const workOrder = await this.workOrderService.createWorkOrder(
      validatedData,
      req.user.id
    );

    res.status(201).json({
      status: 'success',
      message: '工单创建成功',
      data: {
        workOrder,
      },
    });
  });

  // Get work order by ID
  getWorkOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);

    const workOrder = await this.workOrderService.getWorkOrderById(id);

    if (!workOrder) {
      throw new AppError('工单不存在', 404);
    }

    res.json({
      status: 'success',
      data: {
        workOrder,
      },
    });
  });

  // Get all work orders with filtering and pagination
  getWorkOrders = asyncHandler(async (req: Request, res: Response) => {
    const queryParams = WorkOrderQuerySchema.parse(req.query);
    
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

    const result = await this.workOrderService.getWorkOrders(
      filters,
      parseInt(queryParams.page),
      parseInt(queryParams.limit)
    );

    res.json({
      status: 'success',
      data: result,
    });
  });

  // Update work order
  updateWorkOrder = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    const { id } = IdParamSchema.parse(req.params);
    const validatedData = UpdateWorkOrderSchema.parse(req.body);

    const workOrder = await this.workOrderService.updateWorkOrder(
      id,
      validatedData,
      req.user.id
    );

    if (!workOrder) {
      throw new AppError('工单更新失败', 400);
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
  deleteWorkOrder = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    const { id } = IdParamSchema.parse(req.params);

    const success = await this.workOrderService.deleteWorkOrder(id, req.user.id);

    if (!success) {
      throw new AppError('工单删除失败', 400);
    }

    res.status(204).json({
      status: 'success',
      message: '工单删除成功',
    });
  });

  // Assign work order to technician
  assignWorkOrder = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    const { id } = IdParamSchema.parse(req.params);
    const { assignedToId } = AssignWorkOrderSchema.parse(req.body);

    const workOrder = await this.workOrderService.assignWorkOrder(
      id,
      assignedToId,
      req.user.id
    );

    if (!workOrder) {
      throw new AppError('工单分配失败', 400);
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
  getMyWorkOrders = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    const { type = 'assigned' } = req.query;
    const queryParams = WorkOrderQuerySchema.parse(req.query);

    const result = await this.workOrderService.getUserWorkOrders(
      req.user.id,
      type as 'created' | 'assigned',
      parseInt(queryParams.page),
      parseInt(queryParams.limit)
    );

    res.json({
      status: 'success',
      data: result,
    });
  });

  // Get work order statistics
  getStatistics = asyncHandler(async (req: Request, res: Response) => {
    const queryParams = WorkOrderQuerySchema.parse(req.query);
    
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
  uploadAttachment = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    const { id } = IdParamSchema.parse(req.params);

    if (!req.file) {
      throw new AppError('请选择要上传的文件', 400);
    }

    const fileUrl = getFileUrl(req.file.filename);

    const workOrder = await this.workOrderService.uploadAttachment(
      id,
      fileUrl,
      req.user.id
    );

    if (!workOrder) {
      throw new AppError('文件上传失败', 400);
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
  removeAttachment = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    const { id } = IdParamSchema.parse(req.params);
    const { fileUrl } = req.body;

    if (!fileUrl) {
      throw new AppError('请提供要删除的文件URL', 400);
    }

    const workOrder = await this.workOrderService.removeAttachment(
      id,
      fileUrl,
      req.user.id
    );

    if (!workOrder) {
      throw new AppError('文件删除失败', 400);
    }

    // Delete file from filesystem
    const filename = getFilenameFromUrl(fileUrl);
    deleteFile(filename);

    res.json({
      status: 'success',
      message: '文件删除成功',
      data: {
        workOrder,
      },
    });
  });

  // Get assigned work orders for current technician
  getAssignedWorkOrders = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    const queryParams = WorkOrderQuerySchema.parse(req.query);

    const result = await this.workOrderService.getAssignedWorkOrders(
      req.user.id,
      parseInt(queryParams.page),
      parseInt(queryParams.limit)
    );

    res.json({
      status: 'success',
      data: result,
    });
  });

  // Update work order status
  updateWorkOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    const { id } = IdParamSchema.parse(req.params);
    const validatedData = UpdateWorkOrderStatusSchema.parse(req.body);

    const workOrder = await this.workOrderService.updateWorkOrderStatus(
      id,
      validatedData,
      req.user.id
    );

    if (!workOrder) {
      throw new AppError('工单状态更新失败', 400);
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
  getWorkOrderWithHistory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);

    const workOrder = await this.workOrderService.getWorkOrderWithStatusHistory(id);

    if (!workOrder) {
      throw new AppError('工单不存在', 404);
    }

    res.json({
      status: 'success',
      data: {
        workOrder,
      },
    });
  });

  // Get work order status history
  getWorkOrderStatusHistory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);

    const statusHistory = await this.workOrderService.getWorkOrderStatusHistory(id);

    res.json({
      status: 'success',
      data: {
        statusHistory,
      },
    });
  });

  // Complete work order with resolution record
  completeWorkOrder = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    const { id } = IdParamSchema.parse(req.params);
    
    // Validate resolution data using schema
    const resolutionData = CreateResolutionRecordSchema.parse(req.body);

    const workOrder = await this.workOrderService.completeWorkOrder(
      id,
      resolutionData,
      req.user.id
    );

    res.json({
      status: 'success',
      message: '工单完成成功',
      data: {
        workOrder,
      },
    });
  });

  // Get work order with resolution record
  getWorkOrderWithResolution = asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);

    const workOrder = await this.workOrderService.getWorkOrderWithResolution(id);

    if (!workOrder) {
      throw new AppError('工单不存在', 404);
    }

    res.json({
      status: 'success',
      data: {
        workOrder,
      },
    });
  });

  // Upload resolution photos
  uploadResolutionPhotos = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    const { id } = IdParamSchema.parse(req.params);

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new AppError('请选择要上传的图片文件', 400);
    }

    const photoPaths = req.files.map(file => getFileUrl((file as Express.Multer.File).filename));

    const resolutionRecord = await this.workOrderService.uploadResolutionPhotos(
      id,
      photoPaths,
      req.user.id
    );

    if (!resolutionRecord) {
      throw new AppError('图片上传失败', 400);
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
  getAssetMaintenanceHistory = asyncHandler(async (req: Request, res: Response) => {
    const { assetId } = req.params;
    const queryParams = WorkOrderQuerySchema.parse(req.query);

    if (!assetId) {
      throw new AppError('资产ID不能为空', 400);
    }

    const maintenanceHistory = await this.workOrderService.getAssetMaintenanceHistory(
      assetId,
      parseInt(queryParams.page),
      parseInt(queryParams.limit)
    );

    if (!maintenanceHistory) {
      throw new AppError('资产不存在', 404);
    }

    res.json({
      status: 'success',
      data: {
        maintenanceHistory,
      },
    });
  });

  // KPI Endpoints
  getMTTRStatistics = asyncHandler(async (req: Request, res: Response) => {
    const filters = this.parseKPIFilters(req.query);
    
    const mttrStats = await this.workOrderService.getMTTRStatistics(filters);

    res.json({
      status: 'success',
      data: {
        mttrStatistics: mttrStats,
      },
    });
  });

  getWorkOrderTrends = asyncHandler(async (req: Request, res: Response) => {
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
  getFilterOptions = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    // Check if user is supervisor/admin
    if (!['SUPERVISOR', 'ADMIN'].includes(req.user.role)) {
      throw new AppError('权限不足：只有主管和管理员可以访问筛选选项', 403);
    }

    const filterOptions = await this.workOrderService.getFilterOptions();

    res.json({
      status: 'success',
      data: filterOptions,
    });
  });

  // Export work orders to CSV
  exportWorkOrdersCSV = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    // Check if user is supervisor/admin
    if (!['SUPERVISOR', 'ADMIN'].includes(req.user.role)) {
      throw new AppError('权限不足：只有主管和管理员可以导出工单', 403);
    }

    // Validate and sanitize query parameters
    const queryParams = CSVExportQuerySchema.parse(req.query);
    
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
      throw new AppError('没有找到符合条件的工单', 404);
    }

    // Security: Check export size limit
    if (workOrders.length > MAX_EXPORT_LIMIT) {
      throw new AppError(`导出数据量过大 (${workOrders.length}条)，请缩小查询范围。最大允许导出${MAX_EXPORT_LIMIT}条记录。`, 400);
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

  private parseKPIFilters(query: any) {
    const filters: any = {};

    if (query.status) filters.status = query.status;
    if (query.priority) filters.priority = query.priority;
    if (query.assetId) filters.assetId = query.assetId;
    if (query.createdById) filters.createdById = query.createdById;
    if (query.assignedToId) filters.assignedToId = query.assignedToId;
    if (query.category) filters.category = query.category;

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