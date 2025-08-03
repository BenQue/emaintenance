'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WorkOrderFilters } from './WorkOrderFilters';
import { AdvancedWorkOrderList } from './AdvancedWorkOrderList';
import { WorkOrder } from '../../lib/types/work-order';
import { workOrderService } from '../../lib/services/work-order-service';
import {
  useWorkOrderFilterStore,
  WorkOrderFilters as FilterType,
} from '../../lib/stores/work-order-filter-store';

export function WorkOrderManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    filters,
    getFilterQueryParams,
    setFiltersFromUrl,
    setError,
  } = useWorkOrderFilterStore();

  const [isExporting, setIsExporting] = useState(false);

  // Initialize filters from URL on mount
  useEffect(() => {
    if (searchParams) {
      setFiltersFromUrl(searchParams);
    }
  }, [searchParams, setFiltersFromUrl]);

  // Update URL when filters change
  useEffect(() => {
    const params = getFilterQueryParams();
    const url = `${window.location.pathname}?${params.toString()}`;
    
    // Only update URL if it's different to avoid infinite loops
    if (url !== window.location.href) {
      window.history.replaceState({}, '', url);
    }
  }, [filters, getFilterQueryParams]);

  const handleFiltersChange = (newFilters: FilterType) => {
    // Filters are already updated in the store via the component
    // This is just for any additional side effects if needed
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      
      await workOrderService.exportWorkOrdersCSV(filters);
    } catch (error) {
      console.error('Export failed:', error);
      setError('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleWorkOrderClick = (workOrder: WorkOrder) => {
    router.push(`/dashboard/work-orders/${workOrder.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">工单管理</h1>
          <p className="text-gray-600 mt-2">
            查看、筛选和管理所有工单
          </p>
        </div>
      </div>

      {/* Filters */}
      <WorkOrderFilters 
        onFiltersChange={handleFiltersChange}
        onExport={handleExport}
      />

      {/* Work Orders List */}
      <AdvancedWorkOrderList
        filters={filters}
        onWorkOrderClick={handleWorkOrderClick}
      />

      {/* Export Loading Overlay */}
      {isExporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-lg">正在导出工单数据...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}