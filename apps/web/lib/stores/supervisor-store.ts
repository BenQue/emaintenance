import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { WorkOrder, PaginatedWorkOrders } from '../types/work-order';
import { workOrderService } from '../services/work-order-service';

interface WorkOrderFilters {
  status?: string;
  priority?: string;
  assetId?: string;
  createdById?: string;
  assignedToId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

interface WorkOrderStatistics {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  averageResolutionTime: number | null;
}

interface SupervisorState {
  // State
  allWorkOrders: WorkOrder[];
  statistics: WorkOrderStatistics | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: WorkOrderFilters;

  // Actions
  loadAllWorkOrders: (filters?: WorkOrderFilters, page?: number, limit?: number) => Promise<void>;
  loadStatistics: (filters?: { startDate?: string; endDate?: string }) => Promise<void>;
  updateFilters: (newFilters: WorkOrderFilters) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
}

export const useSupervisorStore = create<SupervisorState>()(
  devtools(
    (set, get) => ({
      // Initial state
      allWorkOrders: [],
      statistics: null,
      loading: false,
      error: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
      filters: {},

      // Actions
      loadAllWorkOrders: async (filters = {}, page = 1, limit = 20) => {
        set({ loading: true, error: null });
        try {
          const result = await workOrderService.getAllWorkOrders(filters, page, limit);
          set({
            allWorkOrders: result.workOrders,
            pagination: {
              page: result.page,
              limit: result.limit,
              total: result.total,
              totalPages: result.totalPages,
            },
            filters,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load work orders',
            loading: false,
          });
        }
      },

      loadStatistics: async (filters = {}) => {
        set({ loading: true, error: null });
        try {
          const statistics = await workOrderService.getWorkOrderStatistics(filters);
          set({
            statistics,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load statistics',
            loading: false,
          });
        }
      },

      updateFilters: (newFilters: WorkOrderFilters) => {
        const { filters } = get();
        const updatedFilters = { ...filters, ...newFilters };
        set({ filters: updatedFilters });
        // Reload work orders with new filters
        get().loadAllWorkOrders(updatedFilters, 1, get().pagination.limit);
      },

      clearFilters: () => {
        set({ filters: {} });
        get().loadAllWorkOrders({}, 1, get().pagination.limit);
      },

      setLoading: (loading: boolean) => {
        set({ loading });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'supervisor-store',
    }
  )
);