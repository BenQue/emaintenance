import { PrismaClient, WorkOrder, Priority, WorkOrderStatus } from '@emaintanance/database';
import { CreateWorkOrderRequest, UpdateWorkOrderRequest, WorkOrderWithRelations, WorkOrderFilters, PaginatedWorkOrders } from '../types/work-order';

export class WorkOrderRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateWorkOrderRequest & { createdById: string }): Promise<WorkOrderWithRelations> {
    const workOrder = await this.prisma.workOrder.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        reason: data.reason,
        location: data.location,
        priority: data.priority,
        assetId: data.assetId,
        createdById: data.createdById,
        attachments: data.attachments || [],
      },
      include: {
        asset: {
          select: {
            id: true,
            assetCode: true,
            name: true,
            location: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return workOrder as WorkOrderWithRelations;
  }

  async findById(id: string): Promise<WorkOrderWithRelations | null> {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            assetCode: true,
            name: true,
            location: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return workOrder as WorkOrderWithRelations | null;
  }

  async findMany(
    filters: WorkOrderFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedWorkOrders> {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.assetId) {
      where.assetId = filters.assetId;
    }

    if (filters.createdById) {
      where.createdById = filters.createdById;
    }

    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.startDate || filters.endDate) {
      where.reportedAt = {};
      if (filters.startDate) {
        where.reportedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.reportedAt.lte = filters.endDate;
      }
    }

    const [workOrders, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          reportedAt: 'desc',
        },
        include: {
          asset: {
            select: {
              id: true,
              assetCode: true,
              name: true,
              location: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      workOrders: workOrders as WorkOrderWithRelations[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async update(id: string, data: UpdateWorkOrderRequest): Promise<WorkOrderWithRelations | null> {
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) {
      updateData.status = data.status;
      
      // Set timestamps based on status changes
      if (data.status === WorkOrderStatus.IN_PROGRESS && !updateData.startedAt) {
        updateData.startedAt = new Date();
      }
      if (data.status === WorkOrderStatus.COMPLETED && !updateData.completedAt) {
        updateData.completedAt = new Date();
      }
    }
    if (data.solution !== undefined) updateData.solution = data.solution;
    if (data.faultCode !== undefined) updateData.faultCode = data.faultCode;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
    if (data.attachments !== undefined) updateData.attachments = data.attachments;

    try {
      const workOrder = await this.prisma.workOrder.update({
        where: { id },
        data: updateData,
        include: {
          asset: {
            select: {
              id: true,
              assetCode: true,
              name: true,
              location: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return workOrder as WorkOrderWithRelations;
    } catch (error) {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.workOrder.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getStatistics(filters: WorkOrderFilters = {}): Promise<{
    total: number;
    byStatus: Record<WorkOrderStatus, number>;
    byPriority: Record<Priority, number>;
    averageResolutionTime: number | null;
  }> {
    const where: any = {};

    if (filters.startDate || filters.endDate) {
      where.reportedAt = {};
      if (filters.startDate) {
        where.reportedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.reportedAt.lte = filters.endDate;
      }
    }

    const [
      total,
      statusCounts,
      priorityCounts,
      completedWorkOrders,
    ] = await Promise.all([
      this.prisma.workOrder.count({ where }),
      this.prisma.workOrder.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.workOrder.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
      this.prisma.workOrder.findMany({
        where: {
          ...where,
          status: WorkOrderStatus.COMPLETED,
          completedAt: { not: null },
        },
        select: {
          reportedAt: true,
          completedAt: true,
        },
      }),
    ]);

    // Initialize status counts
    const byStatus: Record<WorkOrderStatus, number> = {
      [WorkOrderStatus.PENDING]: 0,
      [WorkOrderStatus.IN_PROGRESS]: 0,
      [WorkOrderStatus.WAITING_PARTS]: 0,
      [WorkOrderStatus.COMPLETED]: 0,
      [WorkOrderStatus.CANCELLED]: 0,
    };

    statusCounts.forEach((count) => {
      byStatus[count.status] = count._count;
    });

    // Initialize priority counts
    const byPriority: Record<Priority, number> = {
      [Priority.LOW]: 0,
      [Priority.MEDIUM]: 0,
      [Priority.HIGH]: 0,
      [Priority.URGENT]: 0,
    };

    priorityCounts.forEach((count) => {
      byPriority[count.priority] = count._count;
    });

    // Calculate average resolution time in hours
    let averageResolutionTime: number | null = null;
    if (completedWorkOrders.length > 0) {
      const totalResolutionTime = completedWorkOrders.reduce((sum, wo) => {
        const resolutionTime = new Date(wo.completedAt!).getTime() - new Date(wo.reportedAt).getTime();
        return sum + resolutionTime;
      }, 0);
      
      averageResolutionTime = totalResolutionTime / completedWorkOrders.length / (1000 * 60 * 60); // Convert to hours
    }

    return {
      total,
      byStatus,
      byPriority,
      averageResolutionTime,
    };
  }
}