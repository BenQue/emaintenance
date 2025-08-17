'use client';

import { useState, useEffect } from 'react';
import { format, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  History, 
  Calendar, 
  User, 
  Tag, 
  FileText, 
  Download,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { AssetMaintenanceHistory, FaultCodeLabels } from '../../lib/types/work-order';
import type { MaintenanceHistoryItem } from '../../lib/types/work-order';
import { workOrderService } from '../../lib/services/work-order-service';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

// Safe date formatting utility
const safeFormatDate = (dateValue: string | Date | null | undefined, formatString: string): string => {
  if (!dateValue) return '未设置';
  
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  
  if (!isValid(date)) {
    console.warn('Invalid date value in maintenance history:', dateValue);
    return '无效日期';
  }
  
  return format(date, formatString, { locale: zhCN });
};

interface MaintenanceHistoryProps {
  assetId: string;
}

export function MaintenanceHistory({ assetId }: MaintenanceHistoryProps) {
  const [maintenanceHistory, setMaintenanceHistory] = useState<AssetMaintenanceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    loadMaintenanceHistory();
  }, [assetId, page]);

  const loadMaintenanceHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workOrderService.getAssetMaintenanceHistory(assetId, page, limit);
      setMaintenanceHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load maintenance history');
    } finally {
      setLoading(false);
    }
  };

  const exportHistory = () => {
    if (!maintenanceHistory) return;
    
    const csvContent = [
      ['工单标题', '故障代码', '技术员', '解决方案', '完成时间'].join(','),
      ...maintenanceHistory.maintenanceHistory.map(item => [
        `"${item.workOrderTitle}"`,
        item.faultCode ? FaultCodeLabels[item.faultCode] : '',
        `"${item.technician}"`,
        `"${item.resolutionSummary || ''}"`,
        safeFormatDate(item.completedAt, 'yyyy-MM-dd HH:mm')
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `维护历史_${maintenanceHistory.assetCode}_${safeFormatDate(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !maintenanceHistory) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载维护历史中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadMaintenanceHistory}>重试</Button>
        </CardContent>
      </Card>
    );
  }

  if (!maintenanceHistory || maintenanceHistory.maintenanceHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <History className="w-5 h-5 mr-2" />
            维护历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无维护记录</h3>
            <p className="text-gray-600">该设备尚未有完成的维修工单</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <History className="w-5 h-5 mr-2" />
            维护历史 ({maintenanceHistory.totalRecords} 条记录)
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={exportHistory}
            className="flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          设备: {maintenanceHistory.assetName} ({maintenanceHistory.assetCode})
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline */}
          <div className="relative">
            {maintenanceHistory.maintenanceHistory.map((item, index) => (
              <MaintenanceHistoryItem
                key={item.id}
                item={item}
                isLast={index === maintenanceHistory.maintenanceHistory.length - 1}
              />
            ))}
          </div>

          {/* Pagination */}
          {maintenanceHistory.totalRecords > limit && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-gray-600">
                显示 {(page - 1) * limit + 1} - {Math.min(page * limit, maintenanceHistory.totalRecords)} 条，
                共 {maintenanceHistory.totalRecords} 条记录
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={page * limit >= maintenanceHistory.totalRecords}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface MaintenanceHistoryItemProps {
  item: MaintenanceHistoryItem;
  isLast: boolean;
}

function MaintenanceHistoryItem({ item, isLast }: MaintenanceHistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-8 w-0.5 h-full bg-gray-200" />
      )}
      
      {/* Timeline dot */}
      <div className="absolute left-2 top-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm" />
      
      {/* Content */}
      <div className="ml-10 pb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">
                {item.workOrderTitle}
              </h4>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {safeFormatDate(item.completedAt, 'yyyy年MM月dd日 HH:mm')}
                </div>
                <div className="flex items-center">
                  <User className="w-3 h-3 mr-1" />
                  {item.technician}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {/* Fault Code */}
          {item.faultCode && (
            <div className="mb-2">
              <Badge variant="outline" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />
                {FaultCodeLabels[item.faultCode]}
              </Badge>
            </div>
          )}

          {/* Expanded Content */}
          {isExpanded && item.resolutionSummary && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <FileText className="w-3 h-3 mr-1" />
                解决方案
              </h5>
              <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                {item.resolutionSummary}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}