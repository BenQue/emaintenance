'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendChart, MetricCard } from '../charts';
import { MetricCardData, TrendData } from '../charts/types';
import { Clock, Timer, TrendingUp, Activity } from 'lucide-react';

interface TimeMetricsProps {
  mttrData?: {
    averageMTTR: number;
    mttrTrend: { period: string; mttr: number }[];
    byPriority: { priority: string; mttr: number }[];
    byCategory: { category: string; mttr: number }[];
  };
  resolutionTimeData?: {
    date: string;
    hours: number;
  }[];
  averageResponseTime?: number;
  loading?: boolean;
  error?: string;
}

export function TimeMetrics({ 
  mttrData, 
  resolutionTimeData = [], 
  averageResponseTime, 
  loading = false, 
  error 
}: TimeMetricsProps) {
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
    if (hours < 1) {
      return `${Math.round(hours * 60)} 分钟`;
    } else if (hours < 24) {
      return `${Math.round(hours * 10) / 10} 小时`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round((hours % 24) * 10) / 10;
      return `${days} 天 ${remainingHours} 小时`;
    }
  };

  // Prepare metric cards data
  const metricCards: MetricCardData[] = [
    {
      title: '平均故障修复时间 (MTTR)',
      value: mttrData ? formatTime(mttrData.averageMTTR) : '暂无数据',
      description: '从故障报告到修复完成的平均时间',
      trend: mttrData && mttrData.mttrTrend.length >= 2 ? {
        direction: mttrData.mttrTrend[0].mttr < mttrData.mttrTrend[mttrData.mttrTrend.length - 1].mttr ? 'up' : 'down',
        percentage: Math.abs(
          ((mttrData.mttrTrend[mttrData.mttrTrend.length - 1].mttr - mttrData.mttrTrend[0].mttr) / mttrData.mttrTrend[0].mttr) * 100
        )
      } : undefined,
    },
    {
      title: '平均响应时间',
      value: averageResponseTime ? formatTime(averageResponseTime) : '暂无数据',
      description: '从工单创建到开始处理的平均时间',
    },
    {
      title: '本周修复效率',
      value: mttrData ? `${Math.round(24 / mttrData.averageMTTR * 10) / 10}` : '0',
      unit: '工单/天',
      description: '基于当前MTTR计算的日均修复能力',
    },
    {
      title: '效率趋势',
      value: mttrData && mttrData.mttrTrend.length >= 2 ? 
        (mttrData.mttrTrend[0].mttr > mttrData.mttrTrend[mttrData.mttrTrend.length - 1].mttr ? '提升' : '下降') : 
        '稳定',
      description: '相比上期的修复效率变化',
    }
  ];

  // Prepare trend data for charts
  const mttrTrendData: TrendData[] = mttrData?.mttrTrend.map(item => ({
    date: item.period,
    value: item.mttr,
  })) || [];

  const resolutionTrendData: TrendData[] = resolutionTimeData.map(item => ({
    date: item.date,
    value: item.hours,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">时间指标</h2>
        <p className="text-gray-600">MTTR、响应时间和效率分析</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((cardData, index) => (
          <MetricCard key={index} data={cardData} />
        ))}
      </div>

      {/* Trend Charts */}
      {(mttrTrendData.length > 0 || resolutionTrendData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MTTR Trend Chart */}
          {mttrTrendData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Timer className="h-5 w-5 mr-2" />
                  MTTR 趋势分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart
                  data={mttrTrendData}
                  width="100%"
                  height={300}
                  xAxisKey="date"
                  yAxisKey="value"
                  lineColor="#FF6B6B"
                />
                <p className="text-sm text-gray-500 mt-2">
                  数值越低表示修复效率越高
                </p>
              </CardContent>
            </Card>
          )}

          {/* Resolution Time Distribution */}
          {resolutionTrendData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  解决时间分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart
                  data={resolutionTrendData}
                  width="100%"
                  height={300}
                  xAxisKey="date"
                  yAxisKey="value"
                  lineColor="#4ECDC4"
                />
                <p className="text-sm text-gray-500 mt-2">
                  各时期的平均解决时间变化
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Category and Priority Analysis */}
      {mttrData && (mttrData.byCategory.length > 0 || mttrData.byPriority.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MTTR by Category */}
          {mttrData.byCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>分类别 MTTR 分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mttrData.byCategory.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{item.category}</span>
                      <span className="text-sm text-gray-600">{formatTime(item.mttr)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* MTTR by Priority */}
          {mttrData.byPriority.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>分优先级 MTTR 分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mttrData.byPriority.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{getPriorityLabel(item.priority)}</span>
                      <span className="text-sm text-gray-600">{formatTime(item.mttr)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function getPriorityLabel(priority: string): string {
  const labels = {
    LOW: '低优先级',
    MEDIUM: '中优先级',
    HIGH: '高优先级',
    URGENT: '紧急',
  };
  return labels[priority as keyof typeof labels] || priority;
}