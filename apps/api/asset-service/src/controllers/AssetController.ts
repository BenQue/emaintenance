import { Request, Response } from 'express';
import { PrismaClient } from '@emaintanance/database';
import { AssetService } from '../services/AssetService';
import { AssetKPIFilters } from '../types/asset';

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
      console.error('Error fetching asset downtime ranking:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset downtime ranking',
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
      console.error('Error fetching fault frequency ranking:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch fault frequency ranking',
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
      console.error('Error fetching maintenance cost analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch maintenance cost analysis',
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
      console.error('Error fetching asset health overview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset health overview',
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
      console.error('Error fetching asset performance ranking:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset performance ranking',
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
      console.error('Error fetching critical assets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch critical assets',
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
}