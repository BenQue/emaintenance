'use client';

import { format, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Clock, MapPin, User, Wrench } from 'lucide-react';
import Link from 'next/link';
import { WorkOrder, WorkOrderStatusLabels, PriorityLabels, StatusColors, PriorityColors } from '../../lib/types/work-order';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader } from '../ui/card';
import { cn } from '../../lib/utils';

// Safe date formatting utility
const safeFormatDate = (dateValue: string | Date | null | undefined, formatString: string): string => {
  if (!dateValue) return '未设置';
  
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  
  if (!isValid(date)) {
    console.warn('Invalid date value in work order card:', dateValue);
    return '无效日期';
  }
  
  return format(date, formatString, { locale: zhCN });
};

interface WorkOrderCardProps {
  workOrder: WorkOrder;
}

export function WorkOrderCard({ workOrder }: WorkOrderCardProps) {
  return (
    <Link href={`/dashboard/my-tasks/${workOrder.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">
                {workOrder.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {workOrder.description}
              </p>
            </div>
            <div className="flex flex-col gap-2 ml-4">
              <Badge className={cn('text-xs', StatusColors[workOrder.status])}>
                {WorkOrderStatusLabels[workOrder.status]}
              </Badge>
              <Badge className={cn('text-xs', PriorityColors[workOrder.priority])}>
                {PriorityLabels[workOrder.priority]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <Wrench className="w-4 h-4 mr-2" />
              <span>{workOrder.asset.assetCode} - {workOrder.asset.name}</span>
            </div>
            
            {workOrder.location && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{workOrder.location}</span>
              </div>
            )}
            
            <div className="flex items-center text-sm text-gray-600">
              <User className="w-4 h-4 mr-2" />
              <span>报修人: {workOrder.createdBy ? 
                `${workOrder.createdBy.firstName || '未知'} ${workOrder.createdBy.lastName || ''}`.trim() 
                : '报修人信息不可用'
              }</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              <span>
                报修时间: {safeFormatDate(workOrder.reportedAt, 'yyyy年MM月dd日 HH:mm')}
              </span>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-gray-500">
                类别: {workOrder.category} | 原因: {workOrder.reason}
              </div>
              
              {workOrder.startedAt && (
                <div className="text-xs text-gray-500">
                  开始时间: {safeFormatDate(workOrder.startedAt, 'MM/dd HH:mm')}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}