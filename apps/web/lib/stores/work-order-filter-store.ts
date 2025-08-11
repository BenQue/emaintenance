import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WorkOrderFilters {
  status?: string;
  priority?: string;
  assetId?: string;
  createdById?: string;
  assignedToId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface FilterOptions {
  statuses: string[];
  priorities: string[];
  categories: string[];
  assets: { id: string; assetCode: string; name: string }[];
  users: { id: string; name: string; role: string }[];
}

interface WorkOrderFilterState {
  // Filter state
  filters: WorkOrderFilters;
  filterOptions: FilterOptions | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  showAdvancedFilters: boolean;
  
  // Pagination
  currentPage: number;
  pageSize: number;
  
  // Actions
  setFilter: (key: keyof WorkOrderFilters, value: string | undefined) => void;
  setFilters: (filters: Partial<WorkOrderFilters>) => void;
  clearFilters: () => void;
  resetFilters: () => void;
  setFilterOptions: (options: FilterOptions) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleAdvancedFilters: () => void;
  
  // URL sync methods
  getFilterQueryParams: () => URLSearchParams;
  setFiltersFromUrl: (searchParams: URLSearchParams) => void;
}

const initialFilters: WorkOrderFilters = {
  sortBy: 'reportedAt',
  sortOrder: 'desc',
  // Default to show only active work orders (exclude COMPLETED)
  status: 'NOT_COMPLETED',
};

export const useWorkOrderFilterStore = create<WorkOrderFilterState>()(
  persist(
    (set, get) => ({
      // State - explicitly set initial filters
      filters: {
        sortBy: 'reportedAt',
        sortOrder: 'desc',
        status: 'NOT_COMPLETED',
      },
      filterOptions: null,
      isLoading: false,
      error: null,
      showAdvancedFilters: false,
      currentPage: 1,
      pageSize: 20,

      // Actions
      setFilter: (key, value) => {
        set((state) => ({
          filters: {
            ...state.filters,
            [key]: value,
          },
          currentPage: 1, // Reset to first page when filter changes
        }));
      },

      setFilters: (newFilters) => {
        set((state) => ({
          filters: {
            ...state.filters,
            ...newFilters,
          },
          currentPage: 1, // Reset to first page when filters change
        }));
      },

      clearFilters: () => {
        set({
          filters: initialFilters,
          currentPage: 1,
        });
      },

      resetFilters: () => {
        set({
          filters: initialFilters,
          currentPage: 1,
          showAdvancedFilters: false,
        });
      },

      setFilterOptions: (options) => {
        set({ filterOptions: options });
      },

      setPage: (page) => {
        set({ currentPage: page });
      },

      setPageSize: (size) => {
        set({ pageSize: size, currentPage: 1 });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      toggleAdvancedFilters: () => {
        set((state) => ({
          showAdvancedFilters: !state.showAdvancedFilters,
        }));
      },

      // URL sync methods
      getFilterQueryParams: () => {
        const { filters, currentPage, pageSize } = get();
        const params = new URLSearchParams();
        
        // Add filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            params.set(key, value);
          }
        });
        
        // Add pagination
        params.set('page', currentPage.toString());
        params.set('limit', pageSize.toString());
        
        return params;
      },

      setFiltersFromUrl: (searchParams) => {
        const newFilters: WorkOrderFilters = { ...initialFilters };
        const supportedParams = [
          'status', 'priority', 'assetId', 'createdById', 'assignedToId',
          'category', 'startDate', 'endDate', 'search', 'sortBy', 'sortOrder'
        ];

        supportedParams.forEach((param) => {
          const value = searchParams.get(param);
          if (value) {
            newFilters[param as keyof WorkOrderFilters] = value;
          }
        });

        const page = searchParams.get('page');
        const limit = searchParams.get('limit');

        set({
          filters: newFilters,
          currentPage: page ? parseInt(page, 10) : 1,
          pageSize: limit ? parseInt(limit, 10) : 20,
        });
      },
    }),
    {
      name: 'work-order-filters-v2', // Change storage key to force reset
      partialize: (state) => ({
        filters: state.filters,
        pageSize: state.pageSize,
        showAdvancedFilters: state.showAdvancedFilters,
      }),
    }
  )
);