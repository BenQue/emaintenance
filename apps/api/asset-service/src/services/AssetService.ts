import { PrismaClient, Asset } from '@emaintenance/database';
import { AssetRepository, CreateAssetData, UpdateAssetData, AssetListFilters, AssetListResult } from '../repositories/AssetRepository';
import { AssetDowntimeStatistics, AssetPerformanceRanking, AssetKPIFilters, AssetHealthMetrics } from '../types/asset';
import { generateAssetQRCode } from '../utils/qr-generator';
import logger from '../utils/logger';
import * as Papa from 'papaparse';

export class AssetService {
  private assetRepository: AssetRepository;

  constructor(private prisma: PrismaClient) {
    this.assetRepository = new AssetRepository(prisma);
  }

  /**
   * Create a new asset
   */
  async createAsset(data: CreateAssetData): Promise<Asset> {
    try {
      // Check if asset code already exists
      const existingAsset = await this.assetRepository.getAssetByCode(data.assetCode);
      if (existingAsset) {
        logger.warn('Asset creation failed: Asset code already exists', {
          assetCode: data.assetCode
        });
        throw new Error('Asset code already exists');
      }

      const asset = await this.assetRepository.createAsset(data);

      logger.info('Asset created via service', {
        assetId: asset.id,
        assetCode: asset.assetCode,
        name: asset.name
      });

      return asset;
    } catch (error) {
      logger.error('Asset service: Failed to create asset', {
        data,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get asset by ID
   */
  async getAssetById(id: string): Promise<Asset> {
    try {
      const asset = await this.assetRepository.getAssetById(id);
      
      if (!asset) {
        logger.warn('Asset service: Asset not found', { assetId: id });
        throw new Error('Asset not found');
      }

      return asset;
    } catch (error) {
      logger.error('Asset service: Failed to get asset by ID', {
        assetId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get asset by code
   */
  async getAssetByCode(assetCode: string): Promise<Asset> {
    try {
      const asset = await this.assetRepository.getAssetByCode(assetCode);
      
      if (!asset) {
        logger.warn('Asset service: Asset not found by code', { assetCode });
        throw new Error('Asset not found');
      }

      return asset;
    } catch (error) {
      logger.error('Asset service: Failed to get asset by code', {
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
      // Check if asset exists
      await this.getAssetById(id);

      // If updating asset code, check for duplicates
      if (data.assetCode) {
        const existingAsset = await this.assetRepository.getAssetByCode(data.assetCode);
        if (existingAsset && existingAsset.id !== id) {
          logger.warn('Asset update failed: Asset code already exists', {
            assetCode: data.assetCode,
            existingAssetId: existingAsset.id,
            updateAssetId: id
          });
          throw new Error('Asset code already exists');
        }
      }

      const asset = await this.assetRepository.updateAsset(id, data);

      logger.info('Asset updated via service', {
        assetId: id,
        updatedFields: Object.keys(data)
      });

      return asset;
    } catch (error) {
      logger.error('Asset service: Failed to update asset', {
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
      // Check if asset exists
      await this.getAssetById(id);

      // Check for active work orders (business rule)
      const activeWorkOrders = await this.prisma.workOrder.count({
        where: {
          assetId: id,
          status: {
            in: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTS']
          }
        }
      });

      if (activeWorkOrders > 0) {
        logger.warn('Asset deletion failed: Active work orders exist', {
          assetId: id,
          activeWorkOrders
        });
        throw new Error('Cannot delete asset with active work orders');
      }

      await this.assetRepository.deleteAsset(id);

      logger.info('Asset deleted via service', { assetId: id });
    } catch (error) {
      logger.error('Asset service: Failed to delete asset', {
        assetId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * List assets with filtering and pagination
   */
  async listAssets(filters: AssetListFilters = {}): Promise<AssetListResult> {
    try {
      const result = await this.assetRepository.listAssets(filters);

      logger.debug('Assets listed via service', {
        total: result.total,
        page: result.page,
        limit: result.limit,
        filters
      });

      return result;
    } catch (error) {
      logger.error('Asset service: Failed to list assets', {
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
      if (!query || query.trim().length === 0) {
        throw new Error('Search query is required');
      }

      const assets = await this.assetRepository.searchAssets(query.trim(), filters);

      logger.debug('Asset search completed via service', {
        query,
        filters,
        resultCount: assets.length
      });

      return assets;
    } catch (error) {
      logger.error('Asset service: Failed to search assets', {
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
      if (!partialCode || partialCode.trim().length === 0) {
        return [];
      }

      const assets = await this.assetRepository.searchAssetsByCode(partialCode.trim(), filters);

      logger.debug('Asset code search completed via service', {
        partialCode: partialCode.trim(),
        filters,
        resultCount: assets.length
      });

      return assets;
    } catch (error) {
      logger.error('Asset service: Failed to search assets by code', {
        partialCode,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Validate asset code
   */
  async validateAssetCode(assetCode: string): Promise<{ exists: boolean; asset?: Asset }> {
    try {
      if (!assetCode || assetCode.trim().length === 0) {
        throw new Error('Asset code is required');
      }

      const result = await this.assetRepository.validateAssetCode(assetCode.trim());

      logger.debug('Asset code validation completed via service', {
        assetCode: assetCode.trim(),
        exists: result.exists
      });

      return result;
    } catch (error) {
      logger.error('Asset service: Failed to validate asset code', {
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
      if (!input || input.trim().length === 0) {
        return [];
      }

      const suggestions = await this.assetRepository.getAssetSuggestions(input.trim(), filters);

      logger.debug('Asset suggestions completed via service', {
        input: input.trim(),
        filters,
        resultCount: suggestions.length
      });

      return suggestions;
    } catch (error) {
      logger.error('Asset service: Failed to get asset suggestions', {
        input,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate QR code for asset
   */
  async generateAssetQRCode(id: string): Promise<string> {
    try {
      const asset = await this.getAssetById(id);
      
      const qrCodeDataURL = await generateAssetQRCode(asset.assetCode);

      logger.info('QR code generated for asset via service', {
        assetId: id,
        assetCode: asset.assetCode
      });

      return qrCodeDataURL;
    } catch (error) {
      logger.error('Asset service: Failed to generate QR code', {
        assetId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get asset maintenance history
   */
  async getAssetMaintenanceHistory(id: string): Promise<any[]> {
    try {
      // Check if asset exists
      await this.getAssetById(id);

      const history = await this.assetRepository.getAssetMaintenanceHistory(id);

      logger.debug('Asset maintenance history retrieved via service', {
        assetId: id,
        recordCount: history.length
      });

      return history;
    } catch (error) {
      logger.error('Asset service: Failed to get maintenance history', {
        assetId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getDowntimeStatistics(filters: AssetKPIFilters = {}): Promise<AssetDowntimeStatistics[]> {
    return await this.assetRepository.getAssetDowntimeStatistics(filters);
  }

  async getDowntimeRanking(filters: AssetKPIFilters = {}): Promise<AssetDowntimeStatistics[]> {
    const statistics = await this.assetRepository.getAssetDowntimeStatistics(filters);
    const limit = filters.limit || 5;
    
    return statistics
      .sort((a, b) => b.totalDowntimeHours - a.totalDowntimeHours)
      .slice(0, limit);
  }

  async getFaultFrequencyRanking(filters: AssetKPIFilters = {}): Promise<AssetPerformanceRanking[]> {
    const performance = await this.assetRepository.getAssetPerformanceRanking(filters);
    const limit = filters.limit || 5;
    
    return performance
      .sort((a, b) => b.faultFrequency - a.faultFrequency)
      .slice(0, limit);
  }

  async getMaintenanceCostAnalysis(filters: AssetKPIFilters = {}): Promise<AssetPerformanceRanking[]> {
    const performance = await this.assetRepository.getAssetPerformanceRanking(filters);
    const limit = filters.limit || 10;
    
    return performance
      .sort((a, b) => b.maintenanceCost - a.maintenanceCost)
      .slice(0, limit);
  }

  async getHealthOverview(filters: AssetKPIFilters = {}): Promise<AssetHealthMetrics> {
    return await this.assetRepository.getAssetHealthMetrics(filters);
  }

  async getPerformanceRanking(filters: AssetKPIFilters = {}): Promise<AssetPerformanceRanking[]> {
    return await this.assetRepository.getAssetPerformanceRanking(filters);
  }

  async getCriticalAssets(filters: AssetKPIFilters = {}): Promise<AssetPerformanceRanking[]> {
    const performance = await this.assetRepository.getAssetPerformanceRanking(filters);
    
    return performance
      .filter(asset => asset.healthScore < 50)
      .sort((a, b) => a.healthScore - b.healthScore)
      .slice(0, filters.limit || 5);
  }

  /**
   * Get unique asset locations
   */
  async getUniqueLocations(): Promise<string[]> {
    try {
      const locations = await this.prisma.asset.findMany({
        select: { location: true },
        distinct: ['location'],
        orderBy: { location: 'asc' }
      });

      const uniqueLocations = locations.map(item => item.location).filter((location): location is string => location !== null);

      logger.debug('Unique locations retrieved via service', {
        count: uniqueLocations.length
      });

      return uniqueLocations;
    } catch (error) {
      logger.error('Asset service: Failed to get unique locations', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get general asset statistics for dashboard
   */
  async getAssetStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    locations: number;
    byLocation: Record<string, number>;
    byManufacturer: Record<string, number>;
  }> {
    try {
      const [
        totalCount,
        activeCount,
        inactiveCount,
        locationStats,
        manufacturerStats
      ] = await Promise.all([
        this.prisma.asset.count(),
        this.prisma.asset.count({ where: { isActive: true } }),
        this.prisma.asset.count({ where: { isActive: false } }),
        this.prisma.asset.groupBy({
          by: ['location'],
          _count: { location: true }
        }),
        this.prisma.asset.groupBy({
          by: ['manufacturer'],
          _count: { manufacturer: true },
          where: { manufacturer: { not: null } }
        })
      ]);

      const byLocation: Record<string, number> = {};
      locationStats.forEach(stat => {
        if (stat.location) {
          byLocation[stat.location] = stat._count.location;
        }
      });

      const byManufacturer: Record<string, number> = {};
      manufacturerStats.forEach(stat => {
        if (stat.manufacturer) {
          byManufacturer[stat.manufacturer] = stat._count.manufacturer;
        }
      });

      const uniqueLocations = locationStats.length;

      logger.debug('Asset statistics retrieved via service', {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        locations: uniqueLocations
      });

      return {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        locations: uniqueLocations,
        byLocation,
        byManufacturer
      };
    } catch (error) {
      logger.error('Asset service: Failed to get asset statistics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 解析并预览CSV文件
   */
  async parseAndPreviewAssetCSV(fileBuffer: Buffer): Promise<{
    headers: string[];
    sampleData: any[];
    totalRows: number;
    validation: {
      valid: number;
      invalid: number;
      errors: Array<{
        row: number;
        field: string;
        error: string;
        data: any;
      }>;
    };
  }> {
    try {
      // 解析CSV
      const csvText = fileBuffer.toString('utf-8');
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
      });

      if (parsed.errors.length > 0) {
        throw new Error(`CSV解析错误: ${parsed.errors[0].message}`);
      }

      const rows = parsed.data as any[];
      const headers = parsed.meta.fields || [];

      // 验证必需字段
      const requiredFields = ['assetCode', 'name', 'location'];
      const missingFields = requiredFields.filter(f => !headers.includes(f));

      if (missingFields.length > 0) {
        throw new Error(`缺少必填字段: ${missingFields.join(', ')}`);
      }

      // 验证数据
      const errors: any[] = [];
      let validCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowErrors: string[] = [];

        // 验证assetCode
        if (!row.assetCode || !row.assetCode.trim()) {
          rowErrors.push('assetCode不能为空');
        }

        // 验证name
        if (!row.name || !row.name.trim()) {
          rowErrors.push('name不能为空');
        }

        // 验证location
        if (!row.location || !row.location.trim()) {
          rowErrors.push('location不能为空');
        } else {
          // 检查location是否存在
          const locationExists = await this.prisma.location.findFirst({
            where: { name: row.location.trim(), isActive: true }
          });
          if (!locationExists) {
            rowErrors.push(`位置不存在: ${row.location}`);
          }
        }

        // 验证assetCode唯一性
        if (row.assetCode && row.assetCode.trim()) {
          const exists = await this.prisma.asset.findUnique({
            where: { assetCode: row.assetCode.trim() }
          });
          if (exists) {
            rowErrors.push(`资产编码已存在: ${row.assetCode}`);
          }
        }

        // 验证日期格式
        if (row.installDate && row.installDate.trim()) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(row.installDate.trim())) {
            rowErrors.push('installDate格式错误，应为YYYY-MM-DD');
          }
        }

        if (rowErrors.length > 0) {
          rowErrors.forEach(error => {
            errors.push({
              row: i + 2, // CSV行号（考虑头部）
              field: '',
              error,
              data: row
            });
          });
        } else {
          validCount++;
        }
      }

      return {
        headers,
        sampleData: rows.slice(0, 10), // 返回前10行作为预览
        totalRows: rows.length,
        validation: {
          valid: validCount,
          invalid: errors.length,
          errors: errors.slice(0, 50), // 最多返回50个错误
        }
      };
    } catch (error) {
      logger.error('Asset service: Failed to parse CSV', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 批量导入资产
   */
  async bulkImportAssets(fileBuffer: Buffer): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: Array<{
      row: number;
      data: any;
      error: string;
    }>;
    imported: any[];
  }> {
    try {
      // 解析CSV
      const csvText = fileBuffer.toString('utf-8');
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
      });

      const rows = parsed.data as any[];
      const results = {
        total: rows.length,
        successful: 0,
        failed: 0,
        errors: [] as any[],
        imported: [] as any[],
      };

      // 逐行导入
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          // 验证必填字段
          if (!row.assetCode?.trim() || !row.name?.trim() || !row.location?.trim()) {
            throw new Error('缺少必填字段');
          }

          // 获取locationId
          const location = await this.prisma.location.findFirst({
            where: { name: row.location.trim(), isActive: true }
          });

          if (!location) {
            throw new Error(`位置不存在: ${row.location}`);
          }

          // 解析日期
          let installDate: Date | null = null;
          if (row.installDate && row.installDate.trim()) {
            const parsedDate = new Date(row.installDate.trim());
            if (!isNaN(parsedDate.getTime())) {
              installDate = parsedDate;
            }
          }

          // 构建描述
          let description = '';
          if (row.category && row.category.trim()) {
            description = `类别: ${row.category.trim()}`;
          }
          if (row.description && row.description.trim()) {
            description = description
              ? `${description}\n${row.description.trim()}`
              : row.description.trim();
          }

          // 创建资产
          const asset = await this.prisma.asset.create({
            data: {
              assetCode: row.assetCode.trim(),
              name: row.name.trim(),
              description: description || null,
              model: row.model?.trim() || null,
              manufacturer: row.manufacturer?.trim() || null,
              serialNumber: row.serialNumber?.trim() || null,
              location: row.location.trim(),
              locationId: location.id,
              installDate,
              isActive: row.status?.trim().toUpperCase() === 'ACTIVE' || !row.status,
            }
          });

          results.successful++;
          results.imported.push(asset);

        } catch (error) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            data: row,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      logger.info('Bulk import completed', {
        total: results.total,
        successful: results.successful,
        failed: results.failed
      });

      return results;
    } catch (error) {
      logger.error('Asset service: Failed to import assets', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}