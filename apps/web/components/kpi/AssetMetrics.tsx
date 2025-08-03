'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CustomBarChart, MetricCard } from '../charts';
import { ChartData, MetricCardData } from '../charts/types';
import { AlertTriangle, Wrench, DollarSign, Shield } from 'lucide-react';

interface AssetMetricsProps {
  downtimeRanking?: Array<{
    assetCode: string;
    assetName: string;
    totalDowntimeHours: number;
    downtimeIncidents: number;
  }>;
  faultFrequencyRanking?: Array<{
    assetCode: string;
    assetName: string;
    faultFrequency: number;
    healthScore: number;
  }>;
  maintenanceCostAnalysis?: Array<{
    assetCode: string;
    assetName: string;
    maintenanceCost: number;
    downtimeHours: number;
  }>;
  healthOverview?: {
    totalAssets: number;
    activeAssets: number;
    assetsWithIssues: number;
    averageHealthScore: number;
    criticalAssets: Array<{
      assetCode: string;
      assetName: string;
      healthScore: number;
    }>;
  };
  loading?: boolean;
  error?: string;
}

export function AssetMetrics({ 
  downtimeRanking = [], 
  faultFrequencyRanking = [], 
  maintenanceCostAnalysis = [],
  healthOverview,
  loading = false, 
  error 
}: AssetMetricsProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500">错误: {error}</div>
      </div>
    );
  }

  const formatTime = (hours: number): string => {
    if (hours < 24) {
      return `${Math.round(hours * 10) / 10} 小时`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round((hours % 24) * 10) / 10;
      return `${days} 天 ${remainingHours} 小时`;
    }
  };

  const formatCurrency = (amount: number): string => {
    return `¥${amount.toLocaleString()}`;
  };

  // Prepare metric cards data
  const metricCards: MetricCardData[] = [
    {
      title: '设备总数',
      value: healthOverview?.totalAssets?.toString() || '0',
      description: '系统中的设备总数量',
    },
    {
      title: '活跃设备',
      value: healthOverview?.activeAssets?.toString() || '0',
      description: '当前正在使用的设备数量',
    },
    {
      title: '问题设备',
      value: healthOverview?.assetsWithIssues?.toString() || '0',
      description: '健康度低于70%的设备数量',
    },
    {
      title: '平均健康度',
      value: healthOverview?.averageHealthScore ? `${Math.round(healthOverview.averageHealthScore)}` : '0',
      unit: '%',
      description: '所有设备的平均健康评分',
      trend: healthOverview?.averageHealthScore ? {
        direction: healthOverview.averageHealthScore >= 70 ? 'up' : 'down',
        percentage: Math.abs(healthOverview.averageHealthScore - 70)
      } : undefined,
    }
  ];

  // Prepare chart data
  const downtimeChartData: ChartData[] = downtimeRanking.slice(0, 5).map(item => ({
    name: item.assetCode,
    value: item.totalDowntimeHours,
  }));

  const faultFrequencyChartData: ChartData[] = faultFrequencyRanking.slice(0, 5).map(item => ({
    name: item.assetCode,
    value: item.faultFrequency,
  }));

  const maintenanceCostChartData: ChartData[] = maintenanceCostAnalysis.slice(0, 5).map(item => ({
    name: item.assetCode,
    value: item.maintenanceCost,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">资产中心指标</h2>
        <p className="text-gray-600">设备停机时间、故障频率和健康度分析</p>
      </div>

      {/* Health Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((cardData, index) => (
          <MetricCard key={index} data={cardData} />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Downtime Ranking */}
        {downtimeChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                停机时间排行榜（前5名）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CustomBarChart
                data={downtimeChartData}
                width="100%"
                height={300}
                orientation="vertical"
                barColor="#FF6B6B"
              />
              <div className="mt-4 space-y-2">
                {downtimeRanking.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="font-medium">{item.assetName}</span>
                    <span className="text-gray-600">
                      {formatTime(item.totalDowntimeHours)} ({item.downtimeIncidents} 次)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fault Frequency Ranking */}
        {faultFrequencyChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wrench className="h-5 w-5 mr-2 text-orange-500" />
                故障频率排行榜（前5名）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CustomBarChart
                data={faultFrequencyChartData}
                width="100%"
                height={300}
                orientation="vertical"
                barColor="#FFA726"
              />
              <div className="mt-4 space-y-2">
                {faultFrequencyRanking.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="font-medium">{item.assetName}</span>
                    <span className="text-gray-600">
                      {item.faultFrequency} 次故障 (健康度: {Math.round(item.healthScore)}%)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Maintenance Cost Analysis */}
        {maintenanceCostChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-500" />
                维护成本分析（前5名）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CustomBarChart
                data={maintenanceCostChartData}
                width="100%"
                height={300}
                orientation="vertical"
                barColor="#66BB6A"
              />
              <div className="mt-4 space-y-2">
                {maintenanceCostAnalysis.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="font-medium">{item.assetName}</span>
                    <span className="text-gray-600">
                      {formatCurrency(item.maintenanceCost)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Critical Assets */}
        {healthOverview?.criticalAssets && healthOverview.criticalAssets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-red-500" />
                关键风险设备
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthOverview.criticalAssets.map((asset, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{asset.assetName}</div>
                      <div className="text-xs text-gray-500">{asset.assetCode}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-600">
                        {Math.round(asset.healthScore)}%
                      </div>
                      <div className="text-xs text-red-500">健康度</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-4">
                健康度低于50%的设备需要立即关注
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}