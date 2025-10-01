'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WorkOrderFilters } from './WorkOrderFilters';
import { AdvancedWorkOrderList } from './AdvancedWorkOrderList';
import { WorkOrderCreateModal } from './WorkOrderCreateModal';
import { WorkOrder } from '../../lib/types/work-order';
import { workOrderService } from '../../lib/services/work-order-service';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { UserRole } from '../../lib/types/user';
import {
  useWorkOrderFilterStore,
  WorkOrderFilters as FilterType,
} from '../../lib/stores/work-order-filter-store';

export function WorkOrderManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasRole } = useCurrentUser();
  const {
    filters,
    getFilterQueryParams,
    setFiltersFromUrl,
    resetFilters,
    setFilters,
    setError,
  } = useWorkOrderFilterStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize filters from URL on mount, with role-based defaults
  useEffect(() => {
    if (!user || initialized) return;

    // Apply role-based default filters for technicians
    if (hasRole(UserRole.TECHNICIAN) && !hasRole(UserRole.SUPERVISOR)) {
      // Technicians always see only their assigned work orders with ACTIVE status
      const technicianFilters = {
        assignedToId: user.id,
        sortBy: 'reportedAt',
        sortOrder: 'asc',
        status: 'ACTIVE', // Always exclude completed/cancelled/closed for technicians
      };

      // If there are URL params, merge them but preserve technician-specific filters
      if (searchParams && searchParams.toString()) {
        const urlFilters: any = {};
        const supportedParams = [
          'priority', 'assetId', 'category', 'startDate', 'endDate', 'search'
        ];
        supportedParams.forEach((param) => {
          const value = searchParams.get(param);
          if (value) {
            urlFilters[param] = value;
          }
        });

        // Merge URL filters with technician defaults (technician defaults take precedence)
        setFilters({
          ...urlFilters,
          ...technicianFilters,
        });
      } else {
        setFilters(technicianFilters);
      }
    } else {
      // Supervisors and admins: use URL filters or defaults
      if (searchParams && searchParams.toString()) {
        setFiltersFromUrl(searchParams);
      } else {
        resetFilters();
      }
    }

    setInitialized(true);
  }, [user, searchParams, setFiltersFromUrl, resetFilters, setFilters, hasRole, initialized]);

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
      
      // Filter out 'ALL' values before sending to backend
      const exportFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => 
          value !== undefined && value !== '' && value !== 'ALL'
        )
      );
      
      await workOrderService.exportWorkOrdersCSV(exportFilters);
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

  const handleCreateClick = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
  };

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    // Trigger a refresh by adding a cache-busting timestamp to force AdvancedWorkOrderList re-render
    // This is more React-friendly than window.location.reload()
    const url = new URL(window.location.href);
    url.searchParams.set('refresh', Date.now().toString());
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Page Header */}
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">工单管理</h1>
              <p className="text-muted-foreground">
                查看、筛选和管理所有工单
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCreateClick}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              创建工单
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div className="space-y-6">
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
        </div>
      </div>

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

      {/* Work Order Creation Modal */}
      <WorkOrderCreateModal
        isOpen={isCreateModalOpen}
        onClose={handleCreateModalClose}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}