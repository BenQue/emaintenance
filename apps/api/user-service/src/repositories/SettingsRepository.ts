import { prisma, Category, Location, FaultCodeMaster, Reason, PriorityLevel } from '@emaintenance/database';
import { MasterDataCreateInput, MasterDataUpdateInput, MasterDataListQuery, MasterDataListResponse, UsageInfo } from '../services/SettingsService';

export class SettingsRepository {
  // Category methods
  async getCategories(query: MasterDataListQuery): Promise<MasterDataListResponse<Category>> {
    const { page = 1, limit = 20, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ name: 'asc' }],
      }),
      prisma.category.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async createCategory(data: MasterDataCreateInput): Promise<Category> {
    return prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });
  }

  async updateCategory(id: string, data: MasterDataUpdateInput): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deleteCategory(id: string): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getCategoryUsage(id: string): Promise<UsageInfo> {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            workOrders: true,
          },
        },
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    const workOrderCount = category._count.workOrders;
    const canDelete = workOrderCount === 0;

    return {
      id: category.id,
      name: category.name,
      workOrderCount,
      canDelete,
    };
  }

  // Location methods
  async getLocations(query: MasterDataListQuery): Promise<MasterDataListResponse<Location>> {
    const { page = 1, limit = 20, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await Promise.all([
      prisma.location.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ name: 'asc' }],
      }),
      prisma.location.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async createLocation(data: MasterDataCreateInput): Promise<Location> {
    return prisma.location.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });
  }

  async updateLocation(id: string, data: MasterDataUpdateInput): Promise<Location> {
    return prisma.location.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deleteLocation(id: string): Promise<Location> {
    return prisma.location.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getLocationUsage(id: string): Promise<UsageInfo> {
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            workOrders: true,
            assets: true,
          },
        },
      },
    });

    if (!location) {
      throw new Error('Location not found');
    }

    const workOrderCount = location._count.workOrders;
    const assetCount = location._count.assets;
    const canDelete = workOrderCount === 0 && assetCount === 0;

    return {
      id: location.id,
      name: location.name,
      workOrderCount,
      assetCount,
      canDelete,
    };
  }

  // FaultCode methods
  async getFaultCodes(query: MasterDataListQuery): Promise<MasterDataListResponse<FaultCodeMaster>> {
    const { page = 1, limit = 20, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await Promise.all([
      prisma.faultCodeMaster.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ name: 'asc' }],
      }),
      prisma.faultCodeMaster.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async createFaultCode(data: MasterDataCreateInput): Promise<FaultCodeMaster> {
    return prisma.faultCodeMaster.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });
  }

  async updateFaultCode(id: string, data: MasterDataUpdateInput): Promise<FaultCodeMaster> {
    return prisma.faultCodeMaster.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deleteFaultCode(id: string): Promise<FaultCodeMaster> {
    return prisma.faultCodeMaster.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getFaultCodeUsage(id: string): Promise<UsageInfo> {
    const faultCode = await prisma.faultCodeMaster.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            resolutionRecords: true,
            maintenanceHistory: true,
          },
        },
      },
    });

    if (!faultCode) {
      throw new Error('Fault code not found');
    }

    const resolutionRecordCount = faultCode._count.resolutionRecords;
    const maintenanceHistoryCount = faultCode._count.maintenanceHistory;
    const canDelete = resolutionRecordCount === 0 && maintenanceHistoryCount === 0;

    return {
      id: faultCode.id,
      name: faultCode.name,
      workOrderCount: 0, // Not directly linked to work orders
      resolutionRecordCount,
      maintenanceHistoryCount,
      canDelete,
    };
  }

  // Reason methods
  async getReasons(query: MasterDataListQuery): Promise<MasterDataListResponse<Reason>> {
    const { page = 1, limit = 20, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await Promise.all([
      prisma.reason.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ name: 'asc' }],
      }),
      prisma.reason.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async createReason(data: MasterDataCreateInput): Promise<Reason> {
    return prisma.reason.create({
      data: {
        name: data.name,
        description: data.description,
        ...(data.categoryId && { categoryId: data.categoryId }),
      },
    });
  }

  async updateReason(id: string, data: MasterDataUpdateInput): Promise<Reason> {
    return prisma.reason.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deleteReason(id: string): Promise<Reason> {
    return prisma.reason.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getReasonUsage(id: string): Promise<UsageInfo> {
    const reason = await prisma.reason.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            workOrders: true,
          },
        },
      },
    });

    if (!reason) {
      throw new Error('Reason not found');
    }

    const workOrderCount = reason._count.workOrders;
    const canDelete = workOrderCount === 0;

    return {
      id: reason.id,
      name: reason.name,
      workOrderCount,
      canDelete,
    };
  }

  // PriorityLevel methods
  async getPriorityLevels(query: MasterDataListQuery): Promise<MasterDataListResponse<PriorityLevel>> {
    const { page = 1, limit = 20, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await Promise.all([
      prisma.priorityLevel.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ level: 'asc' }],
      }),
      prisma.priorityLevel.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async createPriorityLevel(data: MasterDataCreateInput): Promise<PriorityLevel> {
    return prisma.priorityLevel.create({
      data: {
        name: data.name,
        description: data.description,
        level: data.level!,
      },
    });
  }

  async updatePriorityLevel(id: string, data: MasterDataUpdateInput): Promise<PriorityLevel> {
    return prisma.priorityLevel.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.level !== undefined && { level: data.level }),
      },
    });
  }

  async deletePriorityLevel(id: string): Promise<PriorityLevel> {
    return prisma.priorityLevel.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getPriorityLevelUsage(id: string): Promise<UsageInfo> {
    const priority = await prisma.priorityLevel.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            workOrders: true,
          },
        },
      },
    });

    if (!priority) {
      throw new Error('Priority level not found');
    }

    const workOrderCount = priority._count.workOrders;
    const canDelete = workOrderCount === 0;

    return {
      id: priority.id,
      name: priority.name,
      workOrderCount,
      canDelete,
    };
  }

  // Flexible query methods for integrated categories and reasons
  async getCategoriesWithOptions(options: any): Promise<Category[]> {
    return prisma.category.findMany(options);
  }

  async getCategoriesCount(where: any): Promise<number> {
    return prisma.category.count({ where });
  }

  async getCategoryById(id: string): Promise<Category | null> {
    return prisma.category.findUnique({
      where: { id },
      include: {
        reasons: true,
      },
    });
  }

  async getReasonsWithOptions(options: any): Promise<Reason[]> {
    return prisma.reason.findMany(options);
  }

  async getReasonsCount(where: any): Promise<number> {
    return prisma.reason.count({ where });
  }
}