import { PrismaClient } from '@emaintanance/database';
import { WorkOrderRepository } from '../repositories/WorkOrderRepository';
import { CreateWorkOrderRequest, UpdateWorkOrderRequest, WorkOrderWithRelations, WorkOrderFilters, PaginatedWorkOrders } from '../types/work-order';

export class WorkOrderService {
  private workOrderRepository: WorkOrderRepository;

  constructor(private prisma: PrismaClient) {
    this.workOrderRepository = new WorkOrderRepository(prisma);
  }

  async createWorkOrder(
    data: CreateWorkOrderRequest,
    createdById: string
  ): Promise<WorkOrderWithRelations> {
    // Validate that the asset exists and is active
    const asset = await this.prisma.asset.findUnique({
      where: { id: data.assetId },
      select: { id: true, isActive: true, location: true }
    });

    if (!asset) {
      throw new Error('Asset not found');
    }

    if (!asset.isActive) {
      throw new Error('Cannot create work order for inactive asset');
    }

    // Use asset location if no location provided
    const workOrderData = {
      ...data,
      location: data.location || asset.location,
    };

    const workOrder = await this.workOrderRepository.create({
      ...workOrderData,
      createdById,
    });

    return workOrder;
  }

  async getWorkOrderById(id: string): Promise<WorkOrderWithRelations | null> {
    return await this.workOrderRepository.findById(id);
  }

  async getWorkOrders(
    filters: WorkOrderFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedWorkOrders> {
    // Validate pagination parameters
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 20;

    return await this.workOrderRepository.findMany(filters, page, limit);
  }

  async updateWorkOrder(
    id: string,
    data: UpdateWorkOrderRequest,
    userId: string
  ): Promise<WorkOrderWithRelations | null> {
    // Check if work order exists and user has permission to update
    const existingWorkOrder = await this.workOrderRepository.findById(id);
    
    if (!existingWorkOrder) {
      throw new Error('Work order not found');
    }

    // Permission validation with proper separation of concerns
    if (!this.canUserUpdateWorkOrder(existingWorkOrder, userId)) {
      throw new Error('Permission denied: cannot update this work order');
    }

    // Apply role-based field restrictions
    data = this.applyUpdatePermissions(existingWorkOrder, data, userId);

    const updatedWorkOrder = await this.workOrderRepository.update(id, data);
    
    if (!updatedWorkOrder) {
      throw new Error('Failed to update work order');
    }

    return updatedWorkOrder;
  }

  async deleteWorkOrder(id: string, userId: string): Promise<boolean> {
    // Check if work order exists and user has permission to delete
    const existingWorkOrder = await this.workOrderRepository.findById(id);
    
    if (!existingWorkOrder) {
      throw new Error('Work order not found');
    }

    // Only creator can delete work order, and only if it's still pending
    if (existingWorkOrder.createdById !== userId) {
      throw new Error('Permission denied: only creator can delete work order');
    }

    if (existingWorkOrder.status !== 'PENDING') {
      throw new Error('Cannot delete work order that is no longer pending');
    }

    return await this.workOrderRepository.delete(id);
  }

  async assignWorkOrder(
    id: string,
    assignedToId: string,
    assignedById: string
  ): Promise<WorkOrderWithRelations | null> {
    // Verify that the assigned user exists and is a technician
    const assignedUser = await this.prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true, role: true, isActive: true }
    });

    if (!assignedUser) {
      throw new Error('Assigned user not found');
    }

    if (!assignedUser.isActive) {
      throw new Error('Cannot assign to inactive user');
    }

    if (!['TECHNICIAN', 'SUPERVISOR', 'ADMIN'].includes(assignedUser.role)) {
      throw new Error('User role not authorized for work order assignment');
    }

    const updatedWorkOrder = await this.workOrderRepository.update(id, {
      assignedToId,
      status: 'IN_PROGRESS', // Automatically set to in progress when assigned
    });

    if (!updatedWorkOrder) {
      throw new Error('Failed to assign work order');
    }

    return updatedWorkOrder;
  }

  async getWorkOrderStatistics(filters: WorkOrderFilters = {}): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    averageResolutionTime: number | null;
  }> {
    return await this.workOrderRepository.getStatistics(filters);
  }

  async getUserWorkOrders(
    userId: string,
    type: 'created' | 'assigned' = 'assigned',
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedWorkOrders> {
    const filters: WorkOrderFilters = type === 'created' 
      ? { createdById: userId }
      : { assignedToId: userId };

    return await this.getWorkOrders(filters, page, limit);
  }

  async uploadAttachment(
    workOrderId: string,
    filePath: string,
    userId: string
  ): Promise<WorkOrderWithRelations | null> {
    // Check if work order exists and user has permission
    const existingWorkOrder = await this.workOrderRepository.findById(workOrderId);
    
    if (!existingWorkOrder) {
      throw new Error('Work order not found');
    }

    if (!this.canUserAccessAttachment(existingWorkOrder, userId)) {
      throw new Error('Permission denied: cannot update this work order');
    }

    // Add the new file path to attachments
    const updatedAttachments = [...existingWorkOrder.attachments, filePath];

    return await this.workOrderRepository.update(workOrderId, {
      attachments: updatedAttachments,
    });
  }

  async removeAttachment(
    workOrderId: string,
    filePath: string,
    userId: string
  ): Promise<WorkOrderWithRelations | null> {
    // Check if work order exists and user has permission
    const existingWorkOrder = await this.workOrderRepository.findById(workOrderId);
    
    if (!existingWorkOrder) {
      throw new Error('Work order not found');
    }

    if (!this.canUserAccessAttachment(existingWorkOrder, userId)) {
      throw new Error('Permission denied: cannot update this work order');
    }

    // Remove the file path from attachments
    const updatedAttachments = existingWorkOrder.attachments.filter(
      attachment => attachment !== filePath
    );

    return await this.workOrderRepository.update(workOrderId, {
      attachments: updatedAttachments,
    });
  }

  // Helper methods for permission and validation logic
  private canUserUpdateWorkOrder(workOrder: WorkOrderWithRelations, userId: string): boolean {
    return workOrder.createdById === userId || workOrder.assignedToId === userId;
  }

  private applyUpdatePermissions(
    workOrder: WorkOrderWithRelations, 
    data: UpdateWorkOrderRequest, 
    userId: string
  ): UpdateWorkOrderRequest {
    // Creator can update all fields
    if (workOrder.createdById === userId) {
      return data;
    }

    // Assigned technician can only update status, solution, and fault code
    const allowedUpdates: UpdateWorkOrderRequest = {};
    if (data.status !== undefined) allowedUpdates.status = data.status;
    if (data.solution !== undefined) allowedUpdates.solution = data.solution;
    if (data.faultCode !== undefined) allowedUpdates.faultCode = data.faultCode;
    
    return allowedUpdates;
  }

  private canUserAccessAttachment(workOrder: WorkOrderWithRelations, userId: string): boolean {
    return this.canUserUpdateWorkOrder(workOrder, userId);
  }
}