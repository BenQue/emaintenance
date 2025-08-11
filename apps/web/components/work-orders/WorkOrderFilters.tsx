'use client';

import { useEffect, useState } from 'react';
import { Search, Filter, X, Download, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  useWorkOrderFilterStore,
  WorkOrderFilters,
  FilterOptions,
} from '../../lib/stores/work-order-filter-store';
import { workOrderService } from '../../lib/services/work-order-service';

interface WorkOrderFiltersProps {
  onFiltersChange?: (filters: WorkOrderFilters) => void;
  onExport?: () => void;
}

export function WorkOrderFilters({ onFiltersChange, onExport }: WorkOrderFiltersProps) {
  const {
    filters,
    filterOptions,
    showAdvancedFilters,
    isLoading,
    setFilter,
    setFilters,
    clearFilters,
    resetFilters,
    setFilterOptions,
    setLoading,
    setError,
    toggleAdvancedFilters,
  } = useWorkOrderFilterStore();

  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>();

  // Load filter options on mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange?.(filters);
  }, [filters, onFiltersChange]);

  const loadFilterOptions = async () => {
    try {
      setLoading(true);
      const options = await workOrderService.getFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      console.error('Failed to load filter options:', error);
      
      // Provide more specific error messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('权限不足') || errorMessage.includes('403')) {
        setError('您没有权限访问筛选选项。请联系管理员。');
      } else if (errorMessage.includes('认证') || errorMessage.includes('401')) {
        setError('认证失败，请重新登录。');
      } else if (errorMessage.includes('工单不存在') || errorMessage.includes('404')) {
        setError('系统配置错误，请联系管理员。');
      } else {
        setError(`加载筛选选项失败: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    
    // Debounce search
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      setFilter('search', value || undefined);
    }, 300);
    
    setSearchTimeout(timeout);
  };

  const handleExport = async () => {
    try {
      onExport?.();
    } catch (error) {
      console.error('Export failed:', error);
      setError('Export failed');
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

  return (
    <Card className="p-4 space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="搜索工单标题、描述、设备..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={toggleAdvancedFilters}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            高级筛选
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            导出
          </Button>
          
          <Button
            variant="outline"
            onClick={resetFilters}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            重置
          </Button>
        </div>
      </div>

      {/* Quick Status Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filters.status === 'NOT_COMPLETED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('status', 'NOT_COMPLETED')}
          className="flex items-center gap-1"
        >
          进行中工单（默认）
        </Button>
        <Button
          variant={filters.status === 'PENDING' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('status', 'PENDING')}
          className="flex items-center gap-1"
        >
          待处理工单
        </Button>
        <Button
          variant={filters.status === 'IN_PROGRESS' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('status', 'IN_PROGRESS')}
          className="flex items-center gap-1"
        >
          进行中
        </Button>
        <Button
          variant={filters.status === 'WAITING_PARTS' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('status', 'WAITING_PARTS')}
          className="flex items-center gap-1"
        >
          等待配件
        </Button>
        <Button
          variant={filters.status === 'COMPLETED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('status', 'COMPLETED')}
          className="flex items-center gap-1"
        >
          已完成工单
        </Button>
        <Button
          variant={!filters.status || filters.status === '' || filters.status === undefined ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('status', undefined)}
          className="flex items-center gap-1"
        >
          全部工单
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="border-t pt-4 space-y-4">
          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilter('status', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有状态</option>
                <option value="ACTIVE">进行中工单（未完成）</option>
                {filterOptions?.statuses.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                优先级
              </label>
              <select
                value={filters.priority || ''}
                onChange={(e) => setFilter('priority', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有优先级</option>
                {filterOptions?.priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {getPriorityLabel(priority)}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                类别
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => setFilter('category', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有类别</option>
                {filterOptions?.categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Asset Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                设备
              </label>
              <select
                value={filters.assetId || ''}
                onChange={(e) => setFilter('assetId', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有设备</option>
                {filterOptions?.assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.assetCode} - {asset.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                负责人
              </label>
              <select
                value={filters.assignedToId || ''}
                onChange={(e) => setFilter('assignedToId', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有负责人</option>
                {filterOptions?.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Created By Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                创建人
              </label>
              <select
                value={filters.createdById || ''}
                onChange={(e) => setFilter('createdById', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有创建人</option>
                {filterOptions?.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始日期
              </label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilter('startDate', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束日期
              </label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilter('endDate', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Sort Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                排序字段
              </label>
              <select
                value={filters.sortBy || 'reportedAt'}
                onChange={(e) => setFilter('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="reportedAt">报告时间</option>
                <option value="completedAt">完成时间</option>
                <option value="title">标题</option>
                <option value="priority">优先级</option>
                <option value="status">状态</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                排序方向
              </label>
              <select
                value={filters.sortOrder || 'desc'}
                onChange={(e) => setFilter('sortOrder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {Object.values(filters).some(value => value && value !== 'reportedAt' && value !== 'desc' && value !== 'NOT_COMPLETED') && (
            <div className="pt-4 border-t">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700">活动筛选:</span>
                {Object.entries(filters).map(([key, value]) => {
                  // Skip default values and the NOT_COMPLETED status (it's the default state)
                  if (!value || value === 'reportedAt' || value === 'desc' || value === 'NOT_COMPLETED') return null;
                  
                  // Get display value
                  let displayValue = value;
                  if (key === 'status') {
                    displayValue = getStatusLabel(value);
                  } else if (key === 'priority') {
                    displayValue = getPriorityLabel(value);
                  }
                  
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {key === 'status' ? '状态' : key === 'priority' ? '优先级' : key}: {displayValue}
                      <button
                        onClick={() => setFilter(key as keyof WorkOrderFilters, key === 'status' ? 'NOT_COMPLETED' : undefined)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  清除所有
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}