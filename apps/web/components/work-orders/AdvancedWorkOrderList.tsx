'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { DataTable } from '../interactive/tables/DataTable';
import { ColumnDef } from '../interactive/tables/types';
import { ConfirmDialog } from '../interactive/dialogs/ConfirmDialog';
import { WorkOrder, PaginatedWorkOrders } from '../../lib/types/work-order';
import { workOrderService } from '../../lib/services/work-order-service';
import {
  useWorkOrderFilterStore,
  WorkOrderFilters,
} from '../../lib/stores/work-order-filter-store';
import { formatDate } from '../../lib/utils';

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
  const [selectedRows, setSelectedRows] = useState<WorkOrder[]>([]);
  const loadingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load work orders  
  const loadWorkOrders = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      console.log('AdvancedWorkOrderList - Loading with filters:', filters);
      const result = await workOrderService.getAllWorkOrders(
        filters,
        currentPage,
        pageSize
      );
      
      console.log('AdvancedWorkOrderList - API result:', result);
      console.log('Setting workOrders state with result:', result);
      setWorkOrders(result);
    } catch (error) {
      console.error('Failed to load work orders - detailed error:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      setError(`Failed to load work orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [filters, currentPage, pageSize, setLoading, setError]);

  // Load work orders when filters or pagination changes
  useEffect(() => {
    // Only load if filters are initialized (has sortBy means store is ready)
    if (filters.sortBy) {
      loadWorkOrders();
    }
  }, [loadWorkOrders, filters.sortBy]);

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

  // Handle bulk operations
  const handleBulkStatusUpdate = useCallback(async (status: string) => {
    if (selectedRows.length === 0) return;

    try {
      // TODO: Implement bulk status update service
      console.log(`Bulk updating ${selectedRows.length} work orders to status: ${status}`);
      setSelectedRows([]);
      await loadWorkOrders(); // Refresh data
    } catch (error) {
      console.error('Failed to update work order status:', error);
    }
  }, [selectedRows, loadWorkOrders]);

  // Define table columns
  const columns: ColumnDef<WorkOrder>[] = useMemo(() => [
    {
      id: 'title',
      header: '标题',
      cell: (workOrder) => (
        <div className="max-w-xs">
          <div className="font-medium">{workOrder.title}</div>
          <div className="text-sm text-muted-foreground line-clamp-2">
            {workOrder.description}
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'asset',
      header: '设备',
      cell: (workOrder) => (
        <div className="text-sm">
          <div className="font-medium">{workOrder.asset.name}</div>
          <div className="text-muted-foreground">{workOrder.asset.assetCode}</div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'status',
      header: '状态',
      cell: (workOrder) => (
        <Badge variant={getStatusBadgeVariant(workOrder.status)}>
          {getStatusLabel(workOrder.status)}
        </Badge>
      ),
      sortable: true,
    },
    {
      id: 'priority',
      header: '优先级',
      cell: (workOrder) => (
        <Badge variant={getPriorityBadgeVariant(workOrder.priority)}>
          {getPriorityLabel(workOrder.priority)}
        </Badge>
      ),
      sortable: true,
    },
    {
      id: 'assignedTo',
      header: '分配给',
      cell: (workOrder) => (
        <div className="text-sm">
          {workOrder.assignedTo 
            ? `${workOrder.assignedTo.firstName || '未知'} ${workOrder.assignedTo.lastName || ''}`.trim()
            : '未分配'
          }
        </div>
      ),
      sortable: true,
    },
    {
      id: 'reportedAt',
      header: '报告时间',
      cell: (workOrder) => formatDate(workOrder.reportedAt),
      sortable: true,
    },
    {
      id: 'duration',
      header: '耗时',
      cell: (workOrder) => {
        if (workOrder.status === 'COMPLETED' && workOrder.completedAt) {
          return formatDuration(workOrder.reportedAt, workOrder.completedAt);
        }
        return formatDuration(workOrder.reportedAt);
      },
      sortable: false,
    },
  ], []);

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

  if (!workOrders) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">没有找到符合条件的工单</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              已选择 {selectedRows.length} 个工单
            </span>
            <div className="flex gap-2">
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-700">
                    批量分配
                  </Button>
                }
                title="批量分配工单"
                description={`确定要批量分配选中的 ${selectedRows.length} 个工单吗？`}
                onConfirm={() => handleBulkStatusUpdate('ASSIGNED')}
              />
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700">
                    标记进行中
                  </Button>
                }
                title="批量更新工单状态"
                description={`确定要将选中的 ${selectedRows.length} 个工单标记为进行中吗？`}
                onConfirm={() => handleBulkStatusUpdate('IN_PROGRESS')}
              />
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="outline" className="text-orange-600 hover:text-orange-700">
                    标记完成
                  </Button>
                }
                title="批量完成工单"
                description={`确定要将选中的 ${selectedRows.length} 个工单标记为完成吗？`}
                onConfirm={() => handleBulkStatusUpdate('COMPLETED')}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedRows([])}
                className="text-gray-600 hover:text-gray-700"
              >
                取消选择
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        data={workOrders.workOrders}
        columns={columns}
        selection={true}
        searchable={false}
        onSelectionChange={setSelectedRows}
        onRowClick={onWorkOrderClick}
        loading={isLoading}
        emptyMessage="没有找到符合条件的工单"
      />
    </div>
  );
}