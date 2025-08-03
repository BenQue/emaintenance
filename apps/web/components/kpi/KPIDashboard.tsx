'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RefreshCw, Calendar, Filter } from 'lucide-react';
import { WorkOrderMetrics } from './WorkOrderMetrics';
import { TimeMetrics } from './TimeMetrics';
import { AssetMetrics } from './AssetMetrics';
import { workOrderService } from '../../lib/services/work-order-service';
import { assetService } from '../../lib/services/asset-service';

interface KPIDashboardProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

interface KPIData {
  workOrderStats?: any;
  workOrderTrends?: any;
  mttrData?: any;
  resolutionTimeData?: any;
  assetDowntimeRanking?: any[];
  assetFaultFrequencyRanking?: any[];
  assetMaintenanceCostAnalysis?: any[];
  assetHealthOverview?: any;
}

export function KPIDashboard({ autoRefresh = true, refreshInterval = 30 }: KPIDashboardProps) {
  const [data, setData] = useState<KPIData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'quarter'>('month');

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = { timeRange: timeFilter };
      
      // Use service methods for API calls
      const [
        workOrderStats,
        workOrderTrends,
        mttrData,
        assetDowntimeRanking,
        assetFaultFrequencyRanking,
        assetMaintenanceCostAnalysis,
        assetHealthOverview
      ] = await Promise.all([
        workOrderService.getStatistics(filters),
        workOrderService.getWorkOrderTrends({ ...filters, granularity: 'day' }),
        workOrderService.getMTTRStatistics({ ...filters, granularity: 'week' }),
        assetService.getDowntimeRanking({ ...filters, limit: 5 }),
        assetService.getFaultFrequencyRanking({ ...filters, limit: 5 }),
        assetService.getMaintenanceCostAnalysis({ ...filters, limit: 5 }),
        assetService.getHealthOverview(filters),
      ]);

      setData({
        workOrderStats,
        workOrderTrends: workOrderTrends?.trends || workOrderTrends,
        mttrData: mttrData?.mttrStatistics || mttrData,
        assetDowntimeRanking,
        assetFaultFrequencyRanking,
        assetMaintenanceCostAnalysis,
        assetHealthOverview,
      });

      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching KPI data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIData();
  }, [timeFilter]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchKPIData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const handleManualRefresh = () => {
    fetchKPIData();
  };

  const formatLastRefresh = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500 text-lg">加载 KPI 数据时出错</div>
        <div className="text-gray-600">{error}</div>
        <Button onClick={handleManualRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">KPI 仪表板</h1>
          <p className="text-gray-600 mt-1">
            最后更新: {formatLastRefresh(lastRefresh)}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Time Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as 'week' | 'month' | 'quarter')}
              className="border rounded-md px-3 py-1 text-sm"
            >
              <option value="week">最近一周</option>
              <option value="month">最近一月</option>
              <option value="quarter">最近三月</option>
            </select>
          </div>

          {/* Manual Refresh Button */}
          <Button
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className="flex items-center text-sm text-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              自动刷新已启用 (每 {refreshInterval} 秒)
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Modules */}
      <div className="space-y-12">
        {/* Work Order Metrics */}
        <WorkOrderMetrics
          statistics={data.workOrderStats}
          trends={data.workOrderTrends}
          loading={loading}
          error={error}
        />

        {/* Time Metrics */}
        <TimeMetrics
          mttrData={data.mttrData}
          resolutionTimeData={data.workOrderTrends?.averageResolutionTime}
          loading={loading}
          error={error}
        />

        {/* Asset Metrics */}
        <AssetMetrics
          downtimeRanking={data.assetDowntimeRanking}
          faultFrequencyRanking={data.assetFaultFrequencyRanking}
          maintenanceCostAnalysis={data.assetMaintenanceCostAnalysis}
          healthOverview={data.assetHealthOverview}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
}