import { PrismaClient } from '@emaintanance/database';
import { WorkOrderRepository } from '../repositories/WorkOrderRepository';
import { AssignmentRuleService } from './AssignmentRuleService';
import { NotificationService } from './NotificationService';
import { CreateWorkOrderRequest, UpdateWorkOrderRequest, WorkOrderWithRelations, WorkOrderFilters, PaginatedWorkOrders, UpdateWorkOrderStatusRequest, WorkOrderStatusHistoryItem, WorkOrderWithStatusHistory } from '../types/work-order';

export class WorkOrderService {
  private workOrderRepository: WorkOrderRepository;
  private assignmentRuleService: AssignmentRuleService;
  private notificationService: NotificationService;

  constructor(private prisma: PrismaClient) {
    this.workOrderRepository = new WorkOrderRepository(prisma);
    this.assignmentRuleService = new AssignmentRuleService(prisma);
    this.notificationService = new NotificationService(prisma);
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

    // Create the work order first
    const workOrder = await this.workOrderRepository.create({
      ...workOrderData,
      createdById,
    });

    // Attempt automatic assignment based on rules
    try {
      const assignmentMatch = await this.assignmentRuleService.findMatchingRule({
        category: workOrder.category,
        location: workOrder.location || undefined,
        priority: workOrder.priority,
      });

      if (assignmentMatch) {
        // Assign the work order to the matched technician
        const assignedWorkOrder = await this.workOrderRepository.update(workOrder.id, {
          assignedToId: assignmentMatch.assignToId,
        });

        // Send notification to assigned technician
        if (assignedWorkOrder?.assignedToId) {
          await this.notificationService.createWorkOrderAssignmentNotification(
            workOrder.id,
            assignedWorkOrder.assignedToId,
            workOrder.title
          );
        }

        return assignedWorkOrder || workOrder;
      }
    } catch (error) {
      // Log assignment error but don't fail work order creation
      console.warn(`Auto-assignment failed for work order ${workOrder.id}:`, error);
    }

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

    // Send notification to assigned technician
    try {
      await this.notificationService.createWorkOrderAssignmentNotification(
        id,
        assignedToId,
        updatedWorkOrder.title
      );
    } catch (error) {
      // Log notification error but don't fail assignment
      console.warn(`Failed to send assignment notification for work order ${id}:`, error);
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

  async updateWorkOrderStatus(
    id: string,
    statusUpdate: UpdateWorkOrderStatusRequest,
    userId: string
  ): Promise<WorkOrderWithRelations | null> {
    // Check if work order exists
    const existingWorkOrder = await this.workOrderRepository.findById(id);
    
    if (!existingWorkOrder) {
      throw new Error('Work order not found');
    }

    // Check if user has permission to update status (only assigned technician or supervisors)
    if (!(await this.canUserUpdateStatus(existingWorkOrder, userId))) {
      throw new Error('Permission denied: only assigned technician or supervisors can update work order status');
    }

    // Validate status transition
    if (!this.isValidStatusTransition(existingWorkOrder.status, statusUpdate.status)) {
      throw new Error(`Invalid status transition from ${existingWorkOrder.status} to ${statusUpdate.status}`);
    }

    const { status, notes } = statusUpdate;

    // Start transaction to update work order and create history record
    return await this.prisma.$transaction(async (tx) => {
      // Update work order status
      const updatedWorkOrder = await tx.workOrder.update({
        where: { id },
        data: { 
          status,
          startedAt: status === 'IN_PROGRESS' && !existingWorkOrder.startedAt ? new Date() : existingWorkOrder.startedAt,
          completedAt: status === 'COMPLETED' ? new Date() : null,
        },
        include: {
          asset: {
            select: {
              id: true,
              assetCode: true,
              name: true,
              location: true,
            }
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      });

      // Create status history record
      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId: id,
          fromStatus: existingWorkOrder.status,
          toStatus: status,
          changedById: userId,
          notes,
        }
      });

      // Send notification to supervisors about status change
      try {
        await this.notificationService.createWorkOrderStatusChangeNotification(
          id,
          existingWorkOrder.status,
          status,
          existingWorkOrder.title
        );
      } catch (error) {
        console.warn(`Failed to send status change notification for work order ${id}:`, error);
      }

      return updatedWorkOrder;
    });
  }

  async getWorkOrderWithStatusHistory(id: string): Promise<WorkOrderWithStatusHistory | null> {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            assetCode: true,
            name: true,
            location: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        statusHistory: {
          include: {
            changedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    return workOrder;
  }

  async getWorkOrderStatusHistory(id: string): Promise<WorkOrderStatusHistoryItem[]> {
    const statusHistory = await this.prisma.workOrderStatusHistory.findMany({
      where: { workOrderId: id },
      include: {
        changedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return statusHistory;
  }

  async getAssignedWorkOrders(
    technicianId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedWorkOrders> {
    // Validate technician role
    const user = await this.prisma.user.findUnique({
      where: { id: technicianId },
      select: { role: true, isActive: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User is not active');
    }

    if (!['TECHNICIAN', 'SUPERVISOR', 'ADMIN'].includes(user.role)) {
      throw new Error('User role not authorized to view assigned work orders');
    }

    return await this.getUserWorkOrders(technicianId, 'assigned', page, limit);
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

  private async canUserUpdateStatus(workOrder: WorkOrderWithRelations, userId: string): Promise<boolean> {
    // Check if user is assigned to the work order
    if (workOrder.assignedToId === userId) {
      return true;
    }

    // Check if user is a supervisor or admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    return user?.role === 'SUPERVISOR' || user?.role === 'ADMIN';
  }

  private isValidStatusTransition(fromStatus: string, toStatus: string): boolean {
    // Define valid status transitions
    const validTransitions: Record<string, string[]> = {
      'PENDING': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['WAITING_PARTS', 'WAITING_EXTERNAL', 'COMPLETED', 'CANCELLED'],
      'WAITING_PARTS': ['IN_PROGRESS', 'CANCELLED'],
      'WAITING_EXTERNAL': ['IN_PROGRESS', 'CANCELLED'],
      'COMPLETED': [], // Cannot transition from completed
      'CANCELLED': [], // Cannot transition from cancelled
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }
}