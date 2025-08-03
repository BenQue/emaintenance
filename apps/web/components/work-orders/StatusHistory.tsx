'use client';

import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Clock, ArrowRight, MessageSquare } from 'lucide-react';
import { WorkOrderStatusHistoryItem, WorkOrderStatusLabels, StatusColors } from '../../lib/types/work-order';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';

interface StatusHistoryProps {
  statusHistory: WorkOrderStatusHistoryItem[];
}

export function StatusHistory({ statusHistory }: StatusHistoryProps) {
  if (statusHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">状态历史</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">暂无状态变更记录</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">状态历史</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statusHistory.map((item, index) => (
            <div key={item.id} className="relative">
              {/* Timeline line */}
              {index < statusHistory.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />
              )}
              
              <div className="flex items-start space-x-4">
                {/* Timeline dot */}
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    {item.fromStatus && (
                      <>
                        <Badge className={cn('text-xs', StatusColors[item.fromStatus])}>
                          {WorkOrderStatusLabels[item.fromStatus]}
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </>
                    )}
                    <Badge className={cn('text-xs', StatusColors[item.toStatus])}>
                      {WorkOrderStatusLabels[item.toStatus]}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-1">
                    操作人: {item.changedBy.firstName} {item.changedBy.lastName}
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-2">
                    {format(new Date(item.createdAt), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN })}
                  </div>
                  
                  {item.notes && (
                    <div className="bg-gray-50 rounded-md p-3 mt-2">
                      <div className="flex items-start space-x-2">
                        <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{item.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}