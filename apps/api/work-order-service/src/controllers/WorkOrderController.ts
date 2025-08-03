import { Request, Response } from 'express';
import { PrismaClient } from '@emaintanance/database';
import { WorkOrderService } from '../services/WorkOrderService';
import { 
  CreateWorkOrderSchema, 
  UpdateWorkOrderSchema, 
  WorkOrderQuerySchema,
  AssignWorkOrderSchema,
  UpdateWorkOrderStatusSchema,
  IdParamSchema 
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
}