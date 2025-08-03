import { PrismaClient } from '@emaintanance/database';
import { AssetDowntimeStatistics, AssetPerformanceRanking, AssetKPIFilters, AssetHealthMetrics } from '../types/asset';

export class AssetRepository {
  constructor(private prisma: PrismaClient) {}

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
        location: asset.location,
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