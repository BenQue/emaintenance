'use client';

import { Clock, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react';
import { WorkOrderStatusLabels, PriorityLabels } from '../../lib/types/work-order';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface StatisticsCardsProps {
  statistics: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    averageResolutionTime: number | null;
  };
}

export function StatisticsCards({ statistics }: StatisticsCardsProps) {
  const formatResolutionTime = (hours: number | null) => {
    if (hours === null) return '暂无数据';
    if (hours < 24) return `${Math.round(hours)} 小时`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return `${days} 天 ${remainingHours} 小时`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Work Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">总工单数</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.total}</div>
          <p className="text-xs text-muted-foreground">
            系统中的工单总数
          </p>
        </CardContent>
      </Card>

      {/* Pending Work Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">待处理工单</CardTitle>
          <AlertCircle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {statistics.byStatus.PENDING || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            需要立即关注的工单
          </p>
        </CardContent>
      </Card>

      {/* In Progress Work Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">进行中工单</CardTitle>
          <Clock className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {statistics.byStatus.IN_PROGRESS || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            正在处理中的工单
          </p>
        </CardContent>
      </Card>

      {/* Completed Work Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">已完成工单</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {statistics.byStatus.COMPLETED || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            本期完成的工单
          </p>
        </CardContent>
      </Card>

      {/* Average Resolution Time */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">平均解决时间</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatResolutionTime(statistics.averageResolutionTime)}
          </div>
          <p className="text-xs text-muted-foreground">
            从创建到完成的平均时间
          </p>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">状态分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(statistics.byStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {WorkOrderStatusLabels[status as keyof typeof WorkOrderStatusLabels] || status}
                </span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Priority Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">优先级分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(statistics.byPriority).map(([priority, count]) => (
              <div key={priority} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {PriorityLabels[priority as keyof typeof PriorityLabels] || priority}
                </span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}