import { Request, Response } from 'express';
import { PrismaClient } from '@emaintenance/database';
import { AssetService } from '../services/AssetService';
import { AssetKPIFilters } from '../types/asset';
import { CreateAssetData, UpdateAssetData, AssetListFilters } from '../repositories/AssetRepository';
import logger from '../utils/logger';

export class AssetController {
  private assetService: AssetService;

  constructor(private prisma: PrismaClient) {
    this.assetService = new AssetService(prisma);
  }

  async getDowntimeRanking(req: Request, res: Response): Promise<void> {
    try {
      const filters = this.parseKPIFilters(req.query);
      const ranking = await this.assetService.getDowntimeRanking(filters);
      
      res.json({
        success: true,
        data: ranking,
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error fetching asset downtime ranking', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset downtime ranking',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getFaultFrequencyRanking(req: Request, res: Response): Promise<void> {
    try {
      const filters = this.parseKPIFilters(req.query);
      const ranking = await this.assetService.getFaultFrequencyRanking(filters);
      
      res.json({
        success: true,
        data: ranking,
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error fetching fault frequency ranking', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch fault frequency ranking',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Create a new asset
   */
  async createAsset(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateAssetData = req.body;
      const asset = await this.assetService.createAsset(data);

      const correlationId = req.headers['x-correlation-id'];
      logger.info('Asset created successfully', {
        correlationId,
        assetId: asset.id,
        assetCode: asset.assetCode
      });

      res.status(201).json({
        success: true,
        data: asset,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error creating asset', {
        correlationId,
        body: req.body,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const statusCode = error instanceof Error && error.message.includes('already exists') ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create asset',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get asset by ID
   */
  async getAssetById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      logger.info('Fetching asset by ID', { assetId: id });
      
      const asset = await this.assetService.getAssetById(id);

      if (asset) {
        logger.info('Successfully retrieved asset', { assetId: id, assetName: asset.name, assetCode: asset.assetCode });
      } else {
        logger.warn('Asset not found', { assetId: id });
      }

      res.json({
        success: true,
        data: asset,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Failed to fetch asset by ID', { assetId: req.params.id, error: error instanceof Error ? error.message : 'Unknown error' });
      
      logger.error('Error fetching asset by ID', {
        correlationId,
        assetId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const statusCode = error instanceof Error && error.message === 'Asset not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch asset',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Update asset
   */
  async updateAsset(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateAssetData = req.body;
      const asset = await this.assetService.updateAsset(id, data);

      const correlationId = req.headers['x-correlation-id'];
      logger.info('Asset updated successfully', {
        correlationId,
        assetId: id,
        updatedFields: Object.keys(data)
      });

      res.json({
        success: true,
        data: asset,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error updating asset', {
        correlationId,
        assetId: req.params.id,
        body: req.body,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      let statusCode = 500;
      if (error instanceof Error) {
        if (error.message === 'Asset not found') statusCode = 404;
        else if (error.message.includes('already exists')) statusCode = 409;
      }

      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update asset',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Delete asset
   */
  async deleteAsset(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.assetService.deleteAsset(id);

      const correlationId = req.headers['x-correlation-id'];
      logger.info('Asset deleted successfully', {
        correlationId,
        assetId: id
      });

      res.json({
        success: true,
        message: 'Asset deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error deleting asset', {
        correlationId,
        assetId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      let statusCode = 500;
      if (error instanceof Error) {
        if (error.message === 'Asset not found') statusCode = 404;
        else if (error.message.includes('active work orders')) statusCode = 409;
      }

      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete asset',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * List assets with pagination and filtering
   */
  async listAssets(req: Request, res: Response): Promise<void> {
    try {
      const filters = this.parseListFilters(req.query);
      const result = await this.assetService.listAssets(filters);

      res.json({
        success: true,
        data: result.assets,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error listing assets', {
        correlationId,
        query: req.query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to list assets',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Search assets
   */
  async searchAssets(req: Request, res: Response): Promise<void> {
    try {
      const { q, category, location, status, limit } = req.query;
      
      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Search query parameter "q" is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const filters = {
        category: category as string,
        location: location as string,
        isActive: status === 'ACTIVE' ? true : status === 'INACTIVE' ? false : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      };

      const assets = await this.assetService.searchAssets(q, filters);

      res.json({
        success: true,
        data: assets,
        query: q,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error searching assets', {
        correlationId,
        query: req.query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search assets',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Search assets by partial code for autocomplete
   * GET /api/assets/search?code={partialCode}
   */
  async searchAssetsByCode(req: Request, res: Response): Promise<void> {
    try {
      const { code, location, status, limit } = req.query;
      
      if (!code || typeof code !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Search code parameter "code" is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const filters = {
        location: location as string,
        isActive: status === 'ACTIVE' ? true : status === 'INACTIVE' ? false : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      };

      const assets = await this.assetService.searchAssetsByCode(code, filters);

      res.json({
        success: true,
        data: assets,
        query: { code, ...filters },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error searching assets by code', {
        correlationId,
        query: req.query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search assets by code',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Validate exact asset code existence
   * GET /api/assets/validate?code={fullCode}
   */
  async validateAssetCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.query;
      
      if (!code || typeof code !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Asset code parameter "code" is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.assetService.validateAssetCode(code);

      res.json({
        success: true,
        data: {
          exists: result.exists,
          asset: result.asset || null,
        },
        query: { code },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error validating asset code', {
        correlationId,
        query: req.query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate asset code',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get asset suggestions with fuzzy matching
   * GET /api/assets/suggest?input={userInput}
   */
  async getAssetSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { input, location, status, limit } = req.query;
      
      if (!input || typeof input !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Search input parameter "input" is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const filters = {
        location: location as string,
        isActive: status === 'ACTIVE' ? true : status === 'INACTIVE' ? false : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      };

      const suggestions = await this.assetService.getAssetSuggestions(input, filters);

      res.json({
        success: true,
        data: suggestions,
        query: { input, ...filters },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error getting asset suggestions', {
        correlationId,
        query: req.query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get asset suggestions',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Download CSV template for asset import
   * GET /api/import/templates/assets
   */
  async downloadCSVTemplate(req: Request, res: Response): Promise<void> {
    try {
      logger.info('CSV template download requested', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // 标准10字段CSV头部（对齐数据库模型）
      const headers = [
        'assetCode',        // 资产编码 (必填, 唯一)
        'name',            // 资产名称 (必填)
        'category',        // 类别 (可选: MECHANICAL/ELECTRICAL/SOFTWARE/OTHER)
        'location',        // 位置 (必填, 必须在Location表中存在)
        'status',          // 状态 (可选: ACTIVE/INACTIVE, 默认ACTIVE)
        'installDate',     // 安装日期 (可选: YYYY-MM-DD)
        'model',           // 设备型号 (可选)
        'manufacturer',    // 制造商 (可选)
        'serialNumber',    // 序列号 (可选)
        'description',     // 详细描述 (可选)
      ];

      // 示例数据行
      const sampleRows = [
        [
          'ASSET001',
          'Sample Equipment',
          'MECHANICAL',
          'HPC-Production',
          'ACTIVE',
          '2024-01-15',
          'Model-X2024',
          'ABC Manufacturing',
          'SN123456789',
          '这是一台示例设备'
        ],
        [
          'ASSET002',
          'Test Device',
          'ELECTRICAL',
          'AD-Production',
          'ACTIVE',
          '',
          '',
          '',
          '',
          ''
        ]
      ];

      // 生成CSV内容（包含BOM for Excel兼容性）
      const BOM = '\uFEFF';
      const csvContent = BOM + [
        headers.join(','),
        ...sampleRows.map(row => row.join(','))
      ].join('\n');

      // 设置响应头
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="assets_import_template.csv"');
      res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));

      logger.info('CSV template generated successfully', {
        filename: 'assets_import_template.csv',
        size: Buffer.byteLength(csvContent, 'utf8'),
      });

      res.status(200).send(csvContent);
    } catch (error) {
      logger.error('Failed to generate CSV template', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate CSV template',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Generate QR code for asset
   */
  async generateQRCode(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const qrCodeDataURL = await this.assetService.generateAssetQRCode(id);

      res.json({
        success: true,
        data: { qrCode: qrCodeDataURL },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error generating QR code', {
        correlationId,
        assetId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const statusCode = error instanceof Error && error.message === 'Asset not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate QR code',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get asset maintenance history
   */
  async getMaintenanceHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const history = await this.assetService.getAssetMaintenanceHistory(id);

      res.json({
        success: true,
        data: history,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error fetching maintenance history', {
        correlationId,
        assetId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const statusCode = error instanceof Error && error.message === 'Asset not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch maintenance history',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getMaintenanceCostAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const filters = this.parseKPIFilters(req.query);
      const analysis = await this.assetService.getMaintenanceCostAnalysis(filters);
      
      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error fetching maintenance cost analysis', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch maintenance cost analysis',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getHealthOverview(req: Request, res: Response): Promise<void> {
    try {
      const filters = this.parseKPIFilters(req.query);
      const overview = await this.assetService.getHealthOverview(filters);
      
      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error fetching asset health overview', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset health overview',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getPerformanceRanking(req: Request, res: Response): Promise<void> {
    try {
      const filters = this.parseKPIFilters(req.query);
      const ranking = await this.assetService.getPerformanceRanking(filters);
      
      res.json({
        success: true,
        data: ranking,
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error fetching asset performance ranking', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset performance ranking',
        timestamp: new Date().toISOString(),
      });
    }
  }

  async getCriticalAssets(req: Request, res: Response): Promise<void> {
    try {
      const filters = this.parseKPIFilters(req.query);
      const criticalAssets = await this.assetService.getCriticalAssets(filters);
      
      res.json({
        success: true,
        data: criticalAssets,
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error fetching critical assets', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch critical assets',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get unique asset locations
   */
  async getLocations(req: Request, res: Response): Promise<void> {
    try {
      const locations = await this.assetService.getUniqueLocations();
      
      res.json({
        success: true,
        data: { locations },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error fetching asset locations', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset locations',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get general asset statistics for dashboard
   */
  async getAssetStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.assetService.getAssetStatistics();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const correlationId = req.headers['x-correlation-id'];
      logger.error('Error fetching asset statistics', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset statistics',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 预览CSV文件
   * POST /api/import/preview/assets
   */
  async previewAssetCSV(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: '未上传文件',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const preview = await this.assetService.parseAndPreviewAssetCSV(req.file.buffer);

      logger.info('CSV preview generated', {
        totalRows: preview.totalRows,
        validRows: preview.validation.valid,
        invalidRows: preview.validation.invalid,
      });

      res.json({
        success: true,
        data: preview,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error previewing CSV', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '预览失败',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 执行批量导入
   * POST /api/import/assets
   */
  async importAssetsFromCSV(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: '未上传文件',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await this.assetService.bulkImportAssets(req.file.buffer);

      logger.info('Bulk import completed', {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
      });

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error importing assets', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '导入失败',
        timestamp: new Date().toISOString(),
      });
    }
  }

  private parseKPIFilters(query: any): AssetKPIFilters {
    const filters: AssetKPIFilters = {};

    if (query.location) {
      filters.location = query.location;
    }

    if (query.assetType) {
      filters.assetType = query.assetType;
    }

    if (query.startDate) {
      filters.startDate = new Date(query.startDate);
    }

    if (query.endDate) {
      filters.endDate = new Date(query.endDate);
    }

    if (query.timeRange && ['week', 'month', 'quarter', 'year'].includes(query.timeRange)) {
      filters.timeRange = query.timeRange;
    }

    if (query.limit) {
      const limit = parseInt(query.limit, 10);
      if (!isNaN(limit) && limit > 0 && limit <= 100) {
        filters.limit = limit;
      }
    }

    return filters;
  }

  private parseListFilters(query: any): AssetListFilters {
    const filters: AssetListFilters = {};

    if (query.page) {
      const page = parseInt(query.page, 10);
      if (!isNaN(page) && page > 0) {
        filters.page = page;
      }
    }

    if (query.limit) {
      const limit = parseInt(query.limit, 10);
      if (!isNaN(limit) && limit > 0 && limit <= 100) {
        filters.limit = limit;
      }
    }

    if (query.search && typeof query.search === 'string') {
      filters.search = query.search.trim();
    }


    if (query.location && typeof query.location === 'string') {
      filters.location = query.location;
    }

    if (query.status && ['ACTIVE', 'INACTIVE'].includes(query.status)) {
      filters.isActive = query.status === 'ACTIVE';
    }

    if (query.sortBy && ['name', 'assetCode', 'createdAt', 'updatedAt'].includes(query.sortBy)) {
      filters.sortBy = query.sortBy;
    }

    if (query.sortOrder && ['asc', 'desc'].includes(query.sortOrder)) {
      filters.sortOrder = query.sortOrder;
    }

    return filters;
  }
}