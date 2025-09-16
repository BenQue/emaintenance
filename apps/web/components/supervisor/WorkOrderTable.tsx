'use client';

import { format, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Eye, Filter, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { WorkOrder, WorkOrderStatusLabels, PriorityLabels, StatusColors, PriorityColors } from '../../lib/types/work-order';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';

// Safe date formatting utility
const safeFormatDate = (dateValue: string | Date | null | undefined, formatString: string): string => {
  if (!dateValue) return '未设置';
  
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  
  if (!isValid(date)) {
    console.warn('Invalid date value in work order table:', dateValue);
    return '无效日期';
  }
  
  return format(date, formatString, { locale: zhCN });
};

interface WorkOrderTableProps {
  workOrders: WorkOrder[];
  loading: boolean;
  onRefresh: () => void;
}

export function WorkOrderTable({ workOrders, loading, onRefresh }: WorkOrderTableProps) {
  if (workOrders.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无工单</h3>
          <p className="text-gray-600">没有符合条件的工单记录</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">工单列表</CardTitle>
          <Button 
            onClick={onRefresh} 
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">工单号</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">工单标题</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">状态</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">优先级</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">设备</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">分配给</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">报修人</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">创建时间</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((workOrder) => (
                <tr key={workOrder.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-blue-600">
                      {workOrder.workOrderNumber || workOrder.id.slice(0, 8)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-gray-900 line-clamp-1">
                        {workOrder.title}
                      </div>
                      <div className="text-sm text-gray-600 line-clamp-1">
                        {workOrder.description}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={cn('text-xs', StatusColors[workOrder.status])}>
                      {WorkOrderStatusLabels[workOrder.status]}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={cn('text-xs', PriorityColors[workOrder.priority])}>
                      {PriorityLabels[workOrder.priority]}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-gray-900">
                        {workOrder.asset.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {workOrder.asset.assetCode}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {workOrder.assignedTo ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {workOrder.assignedTo.firstName} {workOrder.assignedTo.lastName}
                        </div>
                        <div className="text-xs text-gray-600">
                          {workOrder.assignedTo.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">未分配</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {workOrder.createdBy.firstName} {workOrder.createdBy.lastName}
                      </div>
                      <div className="text-xs text-gray-600">
                        {workOrder.createdBy.email}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-gray-900">
                      {safeFormatDate(workOrder.reportedAt, 'MM/dd HH:mm')}
                    </div>
                    <div className="text-xs text-gray-600">
                      {safeFormatDate(workOrder.reportedAt, 'yyyy年')}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/dashboard/work-orders/${workOrder.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        查看
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}