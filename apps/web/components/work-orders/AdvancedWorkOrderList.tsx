'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Calendar, User, Wrench } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { WorkOrder, PaginatedWorkOrders } from '../../lib/types/work-order';
import { workOrderService } from '../../lib/services/work-order-service';
import {
  useWorkOrderFilterStore,
  WorkOrderFilters,
} from '../../lib/stores/work-order-filter-store';

interface AdvancedWorkOrderListProps {
  filters: WorkOrderFilters;
  onWorkOrderClick?: (workOrder: WorkOrder) => void;
}

export function AdvancedWorkOrderList({ 
  filters, 
  onWorkOrderClick 
}: AdvancedWorkOrderListProps) {
  const {
    currentPage,
    pageSize,
    isLoading,
    error,
    setPage,
    setPageSize,
    setLoading,
    setError,
  } = useWorkOrderFilterStore();

  const [workOrders, setWorkOrders] = useState<PaginatedWorkOrders | null>(null);

  // Load work orders when filters or pagination changes
  useEffect(() => {
    loadWorkOrders();
  }, [filters, currentPage, pageSize]);

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await workOrderService.getAllWorkOrders(
        filters,
        currentPage,
        pageSize
      );
      
      setWorkOrders(result);
    } catch (error) {
      console.error('Failed to load work orders:', error);
      setError('Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'default';
      case 'LOW':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'IN_PROGRESS':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'WAITING_PARTS':
        return 'secondary';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      LOW: '低',
      MEDIUM: '中',
      HIGH: '高',
      URGENT: '紧急',
    };
    return labels[priority] || priority;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: '待处理',
      IN_PROGRESS: '进行中',
      WAITING_PARTS: '等待配件',
      COMPLETED: '已完成',
      CANCELLED: '已取消',
    };
    return labels[status] || status;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('zh-CN');
  };

  const formatDuration = (start: string | Date, end?: string | Date | null) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = endTime - startTime;
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}天${hours % 24}小时`;
    }
    return `${hours}小时`;
  };

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadWorkOrders} variant="outline">
          重试
        </Button>
      </Card>
    );
  }

  if (isLoading && !workOrders) {
    return (
      <Card className="p-8">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!workOrders || workOrders.workOrders.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">没有找到符合条件的工单</p>
      </Card>
    );
  }

  const totalPages = workOrders.totalPages;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, workOrders.total);

  return (
    <div className="space-y-4">
      {/* Results Summary */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <p>
          显示第 {startItem}-{endItem} 条，共 {workOrders.total} 条工单
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize">每页显示:</label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Work Orders List */}
      <div className="space-y-3">
        {workOrders.workOrders.map((workOrder) => (
          <Card 
            key={workOrder.id} 
            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onWorkOrderClick?.(workOrder)}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{workOrder.title}</h3>
                  <Badge variant={getStatusBadgeVariant(workOrder.status)}>
                    {getStatusLabel(workOrder.status)}
                  </Badge>
                  <Badge variant={getPriorityBadgeVariant(workOrder.priority)}>
                    {getPriorityLabel(workOrder.priority)}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-2 line-clamp-2">{workOrder.description}</p>
              </div>
              <Button variant="ghost" size="sm" className="flex-shrink-0">
                <Eye className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                <span>{workOrder.asset.assetCode} - {workOrder.asset.name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>
                  {workOrder.assignedTo 
                    ? `${workOrder.assignedTo.firstName} ${workOrder.assignedTo.lastName}`
                    : '未分配'
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>报告: {formatDate(workOrder.reportedAt)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {workOrder.status === 'COMPLETED' && workOrder.completedAt
                    ? `完成: ${formatDate(workOrder.completedAt)}`
                    : `耗时: ${formatDuration(workOrder.reportedAt, workOrder.completedAt)}`
                  }
                </span>
              </div>
            </div>

            <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
              <span>类别: {workOrder.category} | 原因: {workOrder.reason}</span>
              <span>创建人: {workOrder.createdBy.firstName} {workOrder.createdBy.lastName}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            
            <div className="flex items-center gap-2">
              {/* Show page numbers */}
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                if (pageNum < 1 || pageNum > totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    disabled={isLoading}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              className="flex items-center gap-2"
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-center text-sm text-gray-500 mt-2">
            第 {currentPage} 页，共 {totalPages} 页
          </div>
        </Card>
      )}
    </div>
  );
}