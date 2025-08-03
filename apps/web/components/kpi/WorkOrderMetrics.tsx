'use client';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CustomPieChart, CustomBarChart, TrendChart } from '../charts';
import { ChartData, TrendData } from '../charts/types';

interface WorkOrderMetricsProps {
  statistics: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    averageResolutionTime: number | null;
  };
  trends?: {
    creationTrend: { date: string; count: number }[];
    completionTrend: { date: string; count: number }[];
  };
  loading?: boolean;
  error?: string;
}

const STATUS_COLORS = {
  PENDING: '#FF8042',
  IN_PROGRESS: '#0088FE',
  WAITING_PARTS: '#FFBB28',
  WAITING_EXTERNAL: '#82CA9D',
  COMPLETED: '#00C49F',
  CANCELLED: '#8884D8',
};

const PRIORITY_COLORS = {
  LOW: '#00C49F',
  MEDIUM: '#FFBB28',
  HIGH: '#FF8042',
  URGENT: '#FF4444',
};

export function WorkOrderMetrics({ statistics, trends, loading = false, error }: WorkOrderMetricsProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
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

  // Prepare data for pie charts
  const statusData: ChartData[] = Object.entries(statistics.byStatus)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: getStatusLabel(status),
      value: count,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
    }));

  const priorityData: ChartData[] = Object.entries(statistics.byPriority)
    .filter(([_, count]) => count > 0)
    .map(([priority, count]) => ({
      name: getPriorityLabel(priority),
      value: count,
      color: PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS],
    }));

  // Prepare trend data
  const creationTrendData: TrendData[] = trends?.creationTrend.map(item => ({
    date: item.date,
    value: item.count,
  })) || [];

  const completionTrendData: TrendData[] = trends?.completionTrend.map(item => ({
    date: item.date,
    value: item.count,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">工单指标</h2>
        <p className="text-gray-600">工单状态分布和趋势分析</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>工单状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomPieChart
              data={statusData}
              width="100%"
              height={300}
              showLabel={true}
              showLegend={true}
            />
          </CardContent>
        </Card>

        {/* Priority Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>工单优先级分布</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomPieChart
              data={priorityData}
              width="100%"
              height={300}
              showLabel={true}
              showLegend={true}
            />
          </CardContent>
        </Card>
      </div>

      {trends && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Work Order Creation Trend */}
          <Card>
            <CardHeader>
              <CardTitle>工单创建趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={creationTrendData}
                width="100%"
                height={300}
                xAxisKey="date"
                yAxisKey="value"
                lineColor="#0088FE"
              />
            </CardContent>
          </Card>

          {/* Work Order Completion Trend */}
          <Card>
            <CardHeader>
              <CardTitle>工单完成趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={completionTrendData}
                width="100%"
                height={300}
                xAxisKey="date"
                yAxisKey="value"
                lineColor="#00C49F"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function getStatusLabel(status: string): string {
  const labels = {
    PENDING: '待处理',
    IN_PROGRESS: '进行中',
    WAITING_PARTS: '等待零件',
    WAITING_EXTERNAL: '等待外部',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
  };
  return labels[status as keyof typeof labels] || status;
}

function getPriorityLabel(priority: string): string {
  const labels = {
    LOW: '低',
    MEDIUM: '中',
    HIGH: '高',
    URGENT: '紧急',
  };
  return labels[priority as keyof typeof labels] || priority;
}