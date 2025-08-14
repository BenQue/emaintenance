import { Request, Response } from 'express';
import { PrismaClient } from '@emaintenance/database';
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
import { PhotoStorageService } from '../services/PhotoStorageService';

export class WorkOrderController {
  private workOrderService: WorkOrderService;
  private photoStorageService: PhotoStorageService;

  constructor(prisma: PrismaClient) {
    this.workOrderService = new WorkOrderService(prisma);
    this.photoStorageService = new PhotoStorageService();
  }

  /**
   * Helper method to validate work order access permissions
   */
  private async validateWorkOrderAccess(workOrderId: string, user: any) {
    const workOrder = await this.workOrderService.getWorkOrderById(workOrderId);
    if (!workOrder) {
      throw new AppError('工单不存在', 404);
    }

    // Check access permission - only creator, assignee, or SUPERVISOR/ADMIN
    if (
      workOrder.createdById !== user.id &&
      workOrder.assignedToId !== user.id &&
      !['SUPERVISOR', 'ADMIN'].includes(user.role)
    ) {
      throw new AppError('权限不足：无法访问此工单', 403);
    }

    return workOrder;
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

    console.log(`[DEBUG] WorkOrderController.getWorkOrder: Fetching work order ID: ${id}`);
    
    const workOrder = await this.workOrderService.getWorkOrderById(id);

    if (!workOrder) {
      console.log(`[WARNING] WorkOrderController.getWorkOrder: Work order not found for ID: ${id}`);
      throw new AppError('工单不存在', 404);
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
  getWorkOrders = asyncHandler(async (req: Request, res: Response) => {
    const queryParams = WorkOrderQuerySchema.parse(req.query);
    
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

    console.log(`[DEBUG] WorkOrderController.getWorkOrderWithHistory: Fetching work order history for ID: ${id}`);
    
    const workOrder = await this.workOrderService.getWorkOrderWithStatusHistory(id);

    if (!workOrder) {
      console.log(`[WARNING] WorkOrderController.getWorkOrderWithHistory: Work order not found for ID: ${id}`);
      throw new AppError('工单不存在', 404);
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

  // Upload photos to work order
  uploadWorkOrderPhotos = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    const { id } = IdParamSchema.parse(req.params);

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new AppError('请选择要上传的图片文件', 400);
    }

    // Validate work order access
    await this.validateWorkOrderAccess(id, req.user);

    // Save photos using PhotoStorageService
    const photoRecords = [];
    for (const file of req.files as Express.Multer.File[]) {
      const photoRecord = await this.photoStorageService.savePhoto(file, id);
      photoRecords.push(photoRecord);
    }

    // Update work order with photo records
    const updatedWorkOrder = await this.workOrderService.uploadWorkOrderPhotos(
      id,
      photoRecords,
      req.user.id
    );

    if (!updatedWorkOrder) {
      throw new AppError('照片上传失败', 400);
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
  getWorkOrderPhotos = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    const { id } = IdParamSchema.parse(req.params);

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
  getWorkOrderPhoto = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    const { id, photoId } = req.params;

    if (!id || !photoId) {
      throw new AppError('工单ID和照片ID不能为空', 400);
    }

    // Validate work order access
    await this.validateWorkOrderAccess(id, req.user);

    // Get photo metadata
    const photo = await this.workOrderService.getWorkOrderPhotoById(photoId);
    if (!photo) {
      throw new AppError('照片不存在', 404);
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
  getWorkOrderPhotoThumbnail = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('用户未认证', 401);
    }

    const { id, photoId } = req.params;

    if (!id || !photoId) {
      throw new AppError('工单ID和照片ID不能为空', 400);
    }

    // Validate work order access
    await this.validateWorkOrderAccess(id, req.user);

    // Get photo metadata
    const photo = await this.workOrderService.getWorkOrderPhotoById(photoId);
    if (!photo || !photo.thumbnailPath) {
      throw new AppError('缩略图不存在', 404);
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

    try {
      const filterOptions = await this.workOrderService.getFilterOptions();

      res.json({
        status: 'success',
        data: filterOptions,
      });
    } catch (error) {
      // Add more specific error handling for database issues
      console.error('Error in getFilterOptions:', error);
      throw new AppError('获取筛选选项失败：数据库查询错误', 500);
    }
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