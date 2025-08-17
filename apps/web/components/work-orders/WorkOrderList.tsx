'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Search, Filter } from 'lucide-react';
import { useWorkOrderStore } from '../../lib/stores/work-order-store';
import { WorkOrder, WorkOrderStatus, Priority, WorkOrderStatusLabels, PriorityLabels } from '../../lib/types/work-order';
import { WorkOrderCard } from './WorkOrderCard';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function WorkOrderList() {
  const {
    assignedWorkOrders,
    loading,
    error,
    pagination,
    loadAssignedWorkOrders,
    clearError,
  } = useWorkOrderStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL');

  useEffect(() => {
    loadAssignedWorkOrders();
  }, [loadAssignedWorkOrders]);

  const filteredWorkOrders = assignedWorkOrders.filter((workOrder) => {
    const matchesSearch = !searchTerm || 
      workOrder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workOrder.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workOrder.asset.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || workOrder.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || workOrder.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleRefresh = () => {
    loadAssignedWorkOrders(pagination.page, pagination.limit);
  };

  const handleLoadMore = () => {
    if (pagination.page < pagination.totalPages) {
      loadAssignedWorkOrders(pagination.page + 1, pagination.limit);
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => { clearError(); handleRefresh(); }}>
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">我的任务</h1>
          <p className="text-gray-600 mt-1">
            共 {pagination.total} 个分配给您的工单
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">筛选和搜索</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索工单标题、描述或设备..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <Select
                value={statusFilter}
                onValueChange={(value: string) => setStatusFilter(value as WorkOrderStatus | 'ALL')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="所有状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">所有状态</SelectItem>
                  {Object.entries(WorkOrderStatusLabels).map(([status, label]) => (
                    <SelectItem key={status} value={status}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div>
              <Select
                value={priorityFilter}
                onValueChange={(value: string) => setPriorityFilter(value as Priority | 'ALL')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="所有优先级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">所有优先级</SelectItem>
                  {Object.entries(PriorityLabels).map(([priority, label]) => (
                    <SelectItem key={priority} value={priority}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders List */}
      {loading && assignedWorkOrders.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      ) : filteredWorkOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无工单</h3>
            <p className="text-gray-600">
              {assignedWorkOrders.length === 0 
                ? '当前没有分配给您的工单' 
                : '没有符合筛选条件的工单'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {filteredWorkOrders.map((workOrder) => (
              <WorkOrderCard key={workOrder.id} workOrder={workOrder} />
            ))}
          </div>
          
          {/* Load More Button */}
          {pagination.page < pagination.totalPages && (
            <div className="text-center">
              <Button
                onClick={handleLoadMore}
                disabled={loading}
                variant="outline"
                className="w-full max-w-xs"
              >
                {loading ? '加载中...' : '加载更多'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}