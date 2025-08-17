'use client';

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RefreshCw, Calendar, Filter, Activity } from 'lucide-react';
import { WorkOrderMetrics } from './WorkOrderMetrics';
import { TimeMetrics } from './TimeMetrics';
import { AssetMetrics } from './AssetMetrics';
import { DataCard } from '../data-display/cards/DataCard';
import { KPICard } from '../data-display/cards/KPICard';
import { LoadingStates } from '../data-display/indicators/LoadingStates';
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
          <h1 className="text-3xl font-bold">数据分析</h1>
          <p className="text-gray-600 mt-1">
            最后更新: {formatLastRefresh(lastRefresh)}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Time Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select
              value={timeFilter}
              onValueChange={(value: string) => setTimeFilter(value as 'week' | 'month' | 'quarter')}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">最近一周</SelectItem>
                <SelectItem value="month">最近一月</SelectItem>
                <SelectItem value="quarter">最近三月</SelectItem>
              </SelectContent>
            </Select>
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
        <DataCard
          title="自动刷新状态"
          value="已启用"
          subtitle={`每 ${refreshInterval} 秒自动更新数据`}
          icon={Activity}
          variant="info"
          className="col-span-full"
        />
      )}

      {/* KPI Overview Cards */}
      {loading ? (
        <LoadingStates type="card" count={4} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="总工单数"
            value={data.workOrderStats?.total || 0}
            previousValue={data.workOrderStats?.previousTotal}
            description="当前时间范围内的工单总数"
            isLoading={loading}
            error={error}
          />
          <KPICard
            title="已完成工单"
            value={data.workOrderStats?.completed || 0}
            previousValue={data.workOrderStats?.previousCompleted}
            trend={data.workOrderStats?.completedTrend}
            description="已完成的工单数量"
            isLoading={loading}
            error={error}
          />
          <DataCard
            title="平均解决时间"
            value={data.mttrData?.average ? `${data.mttrData.average}h` : '计算中'}
            subtitle="MTTR (Mean Time To Repair)"
            variant={data.mttrData?.average > 24 ? 'warning' : 'success'}
            isLoading={loading}
            error={error}
          />
          <DataCard
            title="资产健康度"
            value={data.assetHealthOverview?.healthScore ? `${data.assetHealthOverview.healthScore}%` : '评估中'}
            subtitle="整体资产状态评分"
            variant={
              data.assetHealthOverview?.healthScore >= 80 ? 'success' :
              data.assetHealthOverview?.healthScore >= 60 ? 'warning' : 'error'
            }
            showProgress={true}
            progressValue={data.assetHealthOverview?.healthScore || 0}
            isLoading={loading}
            error={error}
          />
        </div>
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