import { PrismaClient, Asset } from '@emaintenance/database';
import { AssetDowntimeStatistics, AssetPerformanceRanking, AssetKPIFilters, AssetHealthMetrics } from '../types/asset';
import logger from '../utils/logger';

export interface CreateAssetData {
  assetCode: string;
  name: string;
  description?: string;
  location: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  installDate?: Date;
  isActive?: boolean;
}

export interface UpdateAssetData {
  assetCode?: string;
  name?: string;
  description?: string;
  location?: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  installDate?: Date;
  isActive?: boolean;
}

export interface AssetListFilters {
  page?: number;
  limit?: number;
  search?: string;
  location?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'assetCode' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface AssetListResult {
  assets: Asset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AssetRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new asset
   */
  async createAsset(data: CreateAssetData): Promise<Asset> {
    try {
      const asset = await this.prisma.asset.create({
        data: {
          ...data,
          isActive: data.isActive ?? true,
        },
      });

      logger.info('Asset created successfully', {
        assetId: asset.id,
        assetCode: asset.assetCode,
        name: asset.name
      });

      return asset;
    } catch (error) {
      logger.error('Failed to create asset', {
        data,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get asset by ID
   */
  async getAssetById(id: string): Promise<Asset | null> {
    try {
      const asset = await this.prisma.asset.findUnique({
        where: { id },
      });

      if (asset) {
        logger.debug('Asset retrieved successfully', { assetId: id });
      } else {
        logger.warn('Asset not found', { assetId: id });
      }

      return asset;
    } catch (error) {
      logger.error('Failed to get asset by ID', {
        assetId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get asset by asset code
   */
  async getAssetByCode(assetCode: string): Promise<Asset | null> {
    try {
      const asset = await this.prisma.asset.findUnique({
        where: { assetCode },
      });

      if (asset) {
        logger.debug('Asset retrieved by code successfully', { assetCode });
      } else {
        logger.warn('Asset not found by code', { assetCode });
      }

      return asset;
    } catch (error) {
      logger.error('Failed to get asset by code', {
        assetCode,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update asset
   */
  async updateAsset(id: string, data: UpdateAssetData): Promise<Asset> {
    try {
      const asset = await this.prisma.asset.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      logger.info('Asset updated successfully', {
        assetId: id,
        updatedFields: Object.keys(data)
      });

      return asset;
    } catch (error) {
      logger.error('Failed to update asset', {
        assetId: id,
        data,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Delete asset
   */
  async deleteAsset(id: string): Promise<void> {
    try {
      await this.prisma.asset.delete({
        where: { id },
      });

      logger.info('Asset deleted successfully', { assetId: id });
    } catch (error) {
      logger.error('Failed to delete asset', {
        assetId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * List assets with pagination and filtering
   */
  async listAssets(filters: AssetListFilters = {}): Promise<AssetListResult> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        location,
        isActive,
        sortBy = 'name',
        sortOrder = 'asc'
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { assetCode: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (location) {
        where.location = { contains: location, mode: 'insensitive' };
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      // Get total count and assets
      const [total, assets] = await Promise.all([
        this.prisma.asset.count({ where }),
        this.prisma.asset.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      logger.debug('Assets listed successfully', {
        total,
        page,
        limit,
        totalPages,
        filters
      });

      return {
        assets,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list assets', {
        filters,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Search assets
   */
  async searchAssets(query: string, filters: { location?: string; isActive?: boolean; limit?: number } = {}): Promise<Asset[]> {
    try {
      const { location, isActive, limit = 20 } = filters;

      const where: any = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { assetCode: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { serialNumber: { contains: query, mode: 'insensitive' } },
        ],
      };

      if (location) {
        where.location = { contains: location, mode: 'insensitive' };
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const assets = await this.prisma.asset.findMany({
        where,
        take: limit,
        orderBy: { name: 'asc' },
      });

      logger.debug('Asset search completed', {
        query,
        filters,
        resultCount: assets.length
      });

      return assets;
    } catch (error) {
      logger.error('Failed to search assets', {
        query,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Search assets by partial code for autocomplete
   */
  async searchAssetsByCode(partialCode: string, filters: { location?: string; isActive?: boolean; limit?: number } = {}): Promise<Asset[]> {
    try {
      const { location, isActive, limit = 10 } = filters;
      
      if (!partialCode || partialCode.trim().length === 0) {
        return [];
      }

      const trimmedCode = partialCode.trim();
      const where: any = {
        OR: [
          // Exact match (highest priority)
          { assetCode: { equals: trimmedCode, mode: 'insensitive' } },
          // Prefix match
          { assetCode: { startsWith: trimmedCode, mode: 'insensitive' } },
          // Contains match
          { assetCode: { contains: trimmedCode, mode: 'insensitive' } },
        ],
      };

      if (location) {
        where.location = { contains: location, mode: 'insensitive' };
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const assets = await this.prisma.asset.findMany({
        where,
        take: limit,
        orderBy: [
          // Prioritize exact matches, then prefix matches
          { assetCode: 'asc' },
          { name: 'asc' },
        ],
      });

      logger.debug('Asset code search completed', {
        partialCode: trimmedCode,
        filters,
        resultCount: assets.length
      });

      return assets;
    } catch (error) {
      logger.error('Failed to search assets by code', {
        partialCode,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Validate if asset code exists
   */
  async validateAssetCode(assetCode: string): Promise<{ exists: boolean; asset?: Asset }> {
    try {
      if (!assetCode || assetCode.trim().length === 0) {
        return { exists: false };
      }

      const asset = await this.prisma.asset.findUnique({
        where: { assetCode: assetCode.trim() },
      });

      logger.debug('Asset code validation completed', {
        assetCode: assetCode.trim(),
        exists: !!asset
      });

      return {
        exists: !!asset,
        asset: asset || undefined,
      };
    } catch (error) {
      logger.error('Failed to validate asset code', {
        assetCode,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get asset suggestions with fuzzy matching
   */
  async getAssetSuggestions(input: string, filters: { location?: string; isActive?: boolean; limit?: number } = {}): Promise<Asset[]> {
    try {
      const { location, isActive, limit = 10 } = filters;
      
      if (!input || input.trim().length === 0) {
        return [];
      }

      const trimmedInput = input.trim();
      const where: any = {
        OR: [
          // Asset code matches
          { assetCode: { contains: trimmedInput, mode: 'insensitive' } },
          // Name matches (for additional context)
          { name: { contains: trimmedInput, mode: 'insensitive' } },
        ],
      };

      if (location) {
        where.location = { contains: location, mode: 'insensitive' };
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const assets = await this.prisma.asset.findMany({
        where,
        take: limit,
        orderBy: [
          // Prioritize exact asset code matches
          { assetCode: 'asc' },
          { name: 'asc' },
        ],
      });

      // Simple fuzzy matching score calculation
      const scoredAssets = assets.map(asset => {
        let score = 0;
        
        // Exact match bonus
        if (asset.assetCode.toLowerCase() === trimmedInput.toLowerCase()) {
          score += 100;
        }
        // Prefix match bonus
        else if (asset.assetCode.toLowerCase().startsWith(trimmedInput.toLowerCase())) {
          score += 80;
        }
        // Contains match
        else if (asset.assetCode.toLowerCase().includes(trimmedInput.toLowerCase())) {
          score += 60;
        }
        
        // Name match bonus (lower priority)
        if (asset.name.toLowerCase().includes(trimmedInput.toLowerCase())) {
          score += 20;
        }

        return { ...asset, matchScore: score };
      });

      // Sort by match score and return without score
      const sortedAssets = scoredAssets
        .sort((a, b) => b.matchScore - a.matchScore)
        .map(({ matchScore, ...asset }) => asset);

      logger.debug('Asset suggestions completed', {
        input: trimmedInput,
        filters,
        resultCount: sortedAssets.length
      });

      return sortedAssets;
    } catch (error) {
      logger.error('Failed to get asset suggestions', {
        input,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get asset maintenance history
   */
  async getAssetMaintenanceHistory(assetId: string): Promise<any[]> {
    try {
      const maintenanceHistory = await this.prisma.maintenanceHistory.findMany({
        where: { assetId },
        orderBy: { completedAt: 'desc' },
        include: {
          workOrder: {
            include: {
              assignedTo: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      logger.debug('Asset maintenance history retrieved', {
        assetId,
        recordCount: maintenanceHistory.length
      });

      return maintenanceHistory;
    } catch (error) {
      logger.error('Failed to get asset maintenance history', {
        assetId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getAssetDowntimeStatistics(filters: AssetKPIFilters = {}): Promise<AssetDowntimeStatistics[]> {
    const whereClause = this.buildWhereClause(filters);
    
    // Get assets with their maintenance history
    const assets = await this.prisma.asset.findMany({
      where: whereClause.asset,
      include: {
        maintenanceHistory: {
          where: whereClause.maintenance,
          orderBy: { completedAt: 'desc' },
        },
        workOrders: {
          where: {
            ...whereClause.workOrder,
            status: 'COMPLETED',
            completedAt: { not: null },
          },
          select: {
            reportedAt: true,
            completedAt: true,
          },
        },
      },
    });

    return assets.map(asset => {
      // Calculate total downtime from work orders
      const totalDowntimeMs = asset.workOrders.reduce((total, wo) => {
        if (wo.completedAt && wo.reportedAt) {
          return total + (new Date(wo.completedAt).getTime() - new Date(wo.reportedAt).getTime());
        }
        return total;
      }, 0);

      const totalDowntimeHours = totalDowntimeMs / (1000 * 60 * 60);
      const downtimeIncidents = asset.workOrders.length;
      const averageDowntimePerIncident = downtimeIncidents > 0 ? totalDowntimeHours / downtimeIncidents : 0;
      const lastMaintenanceDate = asset.maintenanceHistory[0]?.completedAt;

      return {
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.name,
        totalDowntimeHours,
        downtimeIncidents,
        averageDowntimePerIncident,
        lastMaintenanceDate,
      };
    });
  }

  async getAssetPerformanceRanking(filters: AssetKPIFilters = {}): Promise<AssetPerformanceRanking[]> {
    const whereClause = this.buildWhereClause(filters);
    const limit = filters.limit || 10;

    const assets = await this.prisma.asset.findMany({
      where: whereClause.asset,
      include: {
        maintenanceHistory: {
          where: whereClause.maintenance,
        },
        workOrders: {
          where: {
            ...whereClause.workOrder,
            status: 'COMPLETED',
            completedAt: { not: null },
          },
          select: {
            reportedAt: true,
            completedAt: true,
            faultCode: true,
          },
        },
      },
    });

    const assetMetrics = assets.map(asset => {
      // Calculate downtime hours
      const downtimeMs = asset.workOrders.reduce((total, wo) => {
        if (wo.completedAt && wo.reportedAt) {
          return total + (new Date(wo.completedAt).getTime() - new Date(wo.reportedAt).getTime());
        }
        return total;
      }, 0);
      const downtimeHours = downtimeMs / (1000 * 60 * 60);

      // Calculate fault frequency
      const faultFrequency = asset.workOrders.length;

      // Estimate maintenance cost (simplified calculation)
      const maintenanceCost = asset.maintenanceHistory.length * 500 + downtimeHours * 100;

      // Calculate health score (0-100)
      const maxDowntime = 100; // hours
      const maxFaults = 20;
      const downtimeScore = Math.max(0, 100 - (downtimeHours / maxDowntime) * 100);
      const faultScore = Math.max(0, 100 - (faultFrequency / maxFaults) * 100);
      const healthScore = (downtimeScore + faultScore) / 2;

      return {
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.name,
        location: asset.location || '未知位置',
        downtimeHours,
        faultFrequency,
        maintenanceCost,
        healthScore,
      };
    });

    // Sort by downtime hours (highest first) and limit results
    return assetMetrics
      .sort((a, b) => b.downtimeHours - a.downtimeHours)
      .slice(0, limit);
  }

  async getAssetHealthMetrics(filters: AssetKPIFilters = {}): Promise<AssetHealthMetrics> {
    const whereClause = this.buildWhereClause(filters);

    const [totalAssets, activeAssets, assetPerformance] = await Promise.all([
      this.prisma.asset.count({
        where: whereClause.asset,
      }),
      this.prisma.asset.count({
        where: {
          ...whereClause.asset,
          isActive: true,
        },
      }),
      this.getAssetPerformanceRanking({ ...filters, limit: 100 }),
    ]);

    const assetsWithIssues = assetPerformance.filter(asset => asset.healthScore < 70).length;
    const averageHealthScore = assetPerformance.length > 0
      ? assetPerformance.reduce((sum, asset) => sum + asset.healthScore, 0) / assetPerformance.length
      : 0;
    
    const criticalAssets = assetPerformance
      .filter(asset => asset.healthScore < 50)
      .slice(0, 5);

    return {
      totalAssets,
      activeAssets,
      assetsWithIssues,
      averageHealthScore,
      criticalAssets,
    };
  }

  private buildWhereClause(filters: AssetKPIFilters) {
    const assetWhere: any = {};
    const maintenanceWhere: any = {};
    const workOrderWhere: any = {};

    if (filters.location) {
      assetWhere.location = filters.location;
    }

    if (filters.assetType) {
      assetWhere.type = filters.assetType;
    }

    // Handle time range for maintenance history and work orders
    if (filters.timeRange || filters.startDate || filters.endDate) {
      const dateFilter: any = {};
      
      if (filters.startDate) {
        dateFilter.gte = filters.startDate;
      } else if (filters.timeRange) {
        const now = new Date();
        const startDate = new Date();
        
        switch (filters.timeRange) {
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        dateFilter.gte = startDate;
      }

      if (filters.endDate) {
        dateFilter.lte = filters.endDate;
      }

      if (Object.keys(dateFilter).length > 0) {
        maintenanceWhere.completedAt = dateFilter;
        workOrderWhere.reportedAt = dateFilter;
      }
    }

    return {
      asset: assetWhere,
      maintenance: maintenanceWhere,
      workOrder: workOrderWhere,
    };
  }
}