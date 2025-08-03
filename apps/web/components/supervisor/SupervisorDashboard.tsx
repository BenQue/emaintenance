'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useSupervisorStore } from '../../lib/stores/supervisor-store';
import { StatisticsCards } from './StatisticsCards';
import { WorkOrderFilters } from './WorkOrderFilters';
import { WorkOrderTable } from './WorkOrderTable';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

export function SupervisorDashboard() {
  const {
    allWorkOrders,
    statistics,
    loading,
    error,
    pagination,
    filters,
    loadAllWorkOrders,
    loadStatistics,
    updateFilters,
    clearFilters,
    clearError,
  } = useSupervisorStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Load initial data
    const loadData = async () => {
      await Promise.all([
        loadAllWorkOrders(),
        loadStatistics(),
      ]);
    };
    
    loadData();
  }, [loadAllWorkOrders, loadStatistics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadAllWorkOrders(filters, pagination.page, pagination.limit),
        loadStatistics(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    updateFilters(newFilters);
    // Also reload statistics with date filters if provided
    if (newFilters.startDate || newFilters.endDate) {
      loadStatistics({
        startDate: newFilters.startDate,
        endDate: newFilters.endDate,
      });
    }
  };

  const handleClearFilters = () => {
    clearFilters();
    loadStatistics(); // Reload statistics without filters
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => { clearError(); handleRefresh(); }}>
              重试
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">工单监控</h1>
          <p className="text-gray-600 mt-1">
            实时监控所有工单状态和统计信息
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={loading || refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
          刷新数据
        </Button>
      </div>

      <div className="space-y-6">
        {/* Statistics Cards */}
        {statistics && (
          <StatisticsCards statistics={statistics} />
        )}

        {/* Filters */}
        <WorkOrderFilters
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        {/* Work Orders Table */}
        {loading && allWorkOrders.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">加载工单数据中...</p>
          </div>
        ) : (
          <>
            <WorkOrderTable
              workOrders={allWorkOrders}
              loading={loading}
              onRefresh={handleRefresh}
            />

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1 || loading}
                    onClick={() => loadAllWorkOrders(filters, pagination.page - 1, pagination.limit)}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages || loading}
                    onClick={() => loadAllWorkOrders(filters, pagination.page + 1, pagination.limit)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}