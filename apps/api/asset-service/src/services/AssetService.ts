import { PrismaClient } from '@emaintanance/database';
import { AssetRepository } from '../repositories/AssetRepository';
import { AssetDowntimeStatistics, AssetPerformanceRanking, AssetKPIFilters, AssetHealthMetrics } from '../types/asset';

export class AssetService {
  private assetRepository: AssetRepository;

  constructor(private prisma: PrismaClient) {
    this.assetRepository = new AssetRepository(prisma);
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
}