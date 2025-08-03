export interface AssetDowntimeStatistics {
  assetId: string;
  assetCode: string;
  assetName: string;
  totalDowntimeHours: number;
  downtimeIncidents: number;
  averageDowntimePerIncident: number;
  lastMaintenanceDate?: Date;
}

export interface AssetPerformanceRanking {
  assetId: string;
  assetCode: string;
  assetName: string;
  location: string;
  downtimeHours: number;
  faultFrequency: number;
  maintenanceCost: number;
  healthScore: number; // 0-100 scale
}

export interface AssetKPIFilters {
  location?: string;
  assetType?: string;
  startDate?: Date;
  endDate?: Date;
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  limit?: number;
}

export interface AssetHealthMetrics {
  totalAssets: number;
  activeAssets: number;
  assetsWithIssues: number;
  averageHealthScore: number;
  criticalAssets: AssetPerformanceRanking[];
}