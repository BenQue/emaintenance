import { Category, Location, FaultCodeMaster, Reason, PriorityLevel } from '@emaintenance/database';
import { SettingsRepository } from '../repositories/SettingsRepository';

export interface MasterDataCreateInput {
  name: string;
  description?: string;
  level?: number; // Only for PriorityLevel
}

export interface MasterDataUpdateInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  level?: number; // Only for PriorityLevel
}

export interface MasterDataListQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface MasterDataListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface UsageInfo {
  id: string;
  name: string;
  workOrderCount: number;
  assetCount?: number;
  resolutionRecordCount?: number;
  maintenanceHistoryCount?: number;
  canDelete: boolean;
}

export class SettingsService {
  private settingsRepository: SettingsRepository;

  constructor() {
    this.settingsRepository = new SettingsRepository();
  }

  // Category methods
  async getCategories(query: MasterDataListQuery): Promise<MasterDataListResponse<Category>> {
    return this.settingsRepository.getCategories(query);
  }

  async createCategory(data: MasterDataCreateInput): Promise<Category> {
    return this.settingsRepository.createCategory(data);
  }

  async updateCategory(id: string, data: MasterDataUpdateInput): Promise<Category> {
    return this.settingsRepository.updateCategory(id, data);
  }

  async deleteCategory(id: string): Promise<Category> {
    // Check if category is in use before deletion
    const usage = await this.settingsRepository.getCategoryUsage(id);
    if (!usage.canDelete) {
      throw new Error(`Cannot delete category: ${usage.workOrderCount} work orders are using this category`);
    }
    return this.settingsRepository.deleteCategory(id);
  }

  async getCategoryUsage(id: string): Promise<UsageInfo> {
    return this.settingsRepository.getCategoryUsage(id);
  }

  // Location methods
  async getLocations(query: MasterDataListQuery): Promise<MasterDataListResponse<Location>> {
    return this.settingsRepository.getLocations(query);
  }

  async createLocation(data: MasterDataCreateInput): Promise<Location> {
    return this.settingsRepository.createLocation(data);
  }

  async updateLocation(id: string, data: MasterDataUpdateInput): Promise<Location> {
    return this.settingsRepository.updateLocation(id, data);
  }

  async deleteLocation(id: string): Promise<Location> {
    // Check if location is in use before deletion
    const usage = await this.settingsRepository.getLocationUsage(id);
    if (!usage.canDelete) {
      throw new Error(`Cannot delete location: ${usage.workOrderCount} work orders and ${usage.assetCount} assets are using this location`);
    }
    return this.settingsRepository.deleteLocation(id);
  }

  async getLocationUsage(id: string): Promise<UsageInfo> {
    return this.settingsRepository.getLocationUsage(id);
  }

  // FaultCode methods
  async getFaultCodes(query: MasterDataListQuery): Promise<MasterDataListResponse<FaultCodeMaster>> {
    return this.settingsRepository.getFaultCodes(query);
  }

  async createFaultCode(data: MasterDataCreateInput): Promise<FaultCodeMaster> {
    return this.settingsRepository.createFaultCode(data);
  }

  async updateFaultCode(id: string, data: MasterDataUpdateInput): Promise<FaultCodeMaster> {
    return this.settingsRepository.updateFaultCode(id, data);
  }

  async deleteFaultCode(id: string): Promise<FaultCodeMaster> {
    // Check if fault code is in use before deletion
    const usage = await this.settingsRepository.getFaultCodeUsage(id);
    if (!usage.canDelete) {
      throw new Error(`Cannot delete fault code: ${usage.resolutionRecordCount} resolution records and ${usage.maintenanceHistoryCount} maintenance history records are using this fault code`);
    }
    return this.settingsRepository.deleteFaultCode(id);
  }

  async getFaultCodeUsage(id: string): Promise<UsageInfo> {
    return this.settingsRepository.getFaultCodeUsage(id);
  }

  // Reason methods
  async getReasons(query: MasterDataListQuery): Promise<MasterDataListResponse<Reason>> {
    return this.settingsRepository.getReasons(query);
  }

  async createReason(data: MasterDataCreateInput): Promise<Reason> {
    return this.settingsRepository.createReason(data);
  }

  async updateReason(id: string, data: MasterDataUpdateInput): Promise<Reason> {
    return this.settingsRepository.updateReason(id, data);
  }

  async deleteReason(id: string): Promise<Reason> {
    // Check if reason is in use before deletion
    const usage = await this.settingsRepository.getReasonUsage(id);
    if (!usage.canDelete) {
      throw new Error(`Cannot delete reason: ${usage.workOrderCount} work orders are using this reason`);
    }
    return this.settingsRepository.deleteReason(id);
  }

  async getReasonUsage(id: string): Promise<UsageInfo> {
    return this.settingsRepository.getReasonUsage(id);
  }

  // PriorityLevel methods
  async getPriorityLevels(query: MasterDataListQuery): Promise<MasterDataListResponse<PriorityLevel>> {
    return this.settingsRepository.getPriorityLevels(query);
  }

  async createPriorityLevel(data: MasterDataCreateInput): Promise<PriorityLevel> {
    if (data.level === undefined) {
      throw new Error('Priority level is required for priority levels');
    }
    return this.settingsRepository.createPriorityLevel(data);
  }

  async updatePriorityLevel(id: string, data: MasterDataUpdateInput): Promise<PriorityLevel> {
    return this.settingsRepository.updatePriorityLevel(id, data);
  }

  async deletePriorityLevel(id: string): Promise<PriorityLevel> {
    // Check if priority level is in use before deletion
    const usage = await this.settingsRepository.getPriorityLevelUsage(id);
    if (!usage.canDelete) {
      throw new Error(`Cannot delete priority level: ${usage.workOrderCount} work orders are using this priority level`);
    }
    return this.settingsRepository.deletePriorityLevel(id);
  }

  async getPriorityLevelUsage(id: string): Promise<UsageInfo> {
    return this.settingsRepository.getPriorityLevelUsage(id);
  }

  // Integrated Categories with Reasons methods
  async getCategoriesWithReasons(query: MasterDataListQuery): Promise<MasterDataListResponse> {
    const { page = 1, limit = 10, search, isActive } = query;
    const offset = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(isActive !== undefined && { isActive }),
    };

    const [items, total] = await Promise.all([
      this.settingsRepository.getCategoriesWithOptions({
        where,
        skip: offset,
        take: limit,
        include: {
          reasons: {
            where: { isActive: true },
            orderBy: { name: 'asc' as const },
          },
        },
        orderBy: { name: 'asc' as const },
      }),
      this.settingsRepository.getCategoriesCount(where),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async getReasonsByCategory(categoryId: string, query: MasterDataListQuery): Promise<MasterDataListResponse> {
    const { page = 1, limit = 10, search, isActive } = query;
    const offset = (page - 1) * limit;

    // Verify category exists
    const category = await this.settingsRepository.getCategoryById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    const where = {
      categoryId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(isActive !== undefined && { isActive }),
    };

    const [items, total] = await Promise.all([
      this.settingsRepository.getReasonsWithOptions({
        where,
        skip: offset,
        take: limit,
        include: {
          category: true,
        },
        orderBy: { name: 'asc' as const },
      }),
      this.settingsRepository.getReasonsCount(where),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async createReasonForCategory(categoryId: string, data: MasterDataCreateInput): Promise<any> {
    // Verify category exists
    const category = await this.settingsRepository.getCategoryById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    if (!category.isActive) {
      throw new Error('Cannot create reason for inactive category');
    }

    // Check if reason name already exists for this category
    const existingReasons = await this.settingsRepository.getReasonsWithOptions({
      where: {
        name: data.name,
        categoryId,
      },
    });

    if (existingReasons.length > 0) {
      throw new Error('Reason with this name already exists for this category');
    }

    return this.settingsRepository.createReason({
      ...data,
      categoryId,
    });
  }
}