import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  SettingsService, 
  Category, 
  Location, 
  FaultCode, 
  Reason, 
  PriorityLevel,
  MasterDataCreateInput, 
  MasterDataUpdateInput, 
  MasterDataListQuery,
  UsageInfo
} from '../services/settings-service';

interface SettingsManagementState {
  // Data
  categories: Category[];
  locations: Location[];
  faultCodes: FaultCode[];
  reasons: Reason[];
  priorityLevels: PriorityLevel[];
  
  // Pagination and totals
  categoriesTotal: number;
  locationsTotal: number;
  faultCodesTotal: number;
  reasonsTotal: number;
  priorityLevelsTotal: number;
  
  page: number;
  limit: number;
  
  // Current master data type being viewed
  currentType: 'integrated-categories' | 'locations' | 'fault-codes' | 'priority-levels';
  
  // Filters and search
  filters: MasterDataListQuery;
  searchQuery: string;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isInitialized: boolean;

  // Error handling
  error: string | null;

  // Actions - Data fetching
  fetchCategories: (query?: MasterDataListQuery) => Promise<void>;
  fetchLocations: (query?: MasterDataListQuery) => Promise<void>;
  fetchFaultCodes: (query?: MasterDataListQuery) => Promise<void>;
  fetchReasons: (query?: MasterDataListQuery) => Promise<void>;
  fetchPriorityLevels: (query?: MasterDataListQuery) => Promise<void>;
  
  refreshCurrentType: () => Promise<void>;

  // Actions - Category management
  createCategory: (data: MasterDataCreateInput) => Promise<Category>;
  updateCategory: (id: string, data: MasterDataUpdateInput) => Promise<Category>;
  deleteCategory: (id: string) => Promise<Category>;
  getCategoryUsage: (id: string) => Promise<UsageInfo>;

  // Actions - Location management
  createLocation: (data: MasterDataCreateInput) => Promise<Location>;
  updateLocation: (id: string, data: MasterDataUpdateInput) => Promise<Location>;
  deleteLocation: (id: string) => Promise<Location>;
  getLocationUsage: (id: string) => Promise<UsageInfo>;

  // Actions - Fault Code management
  createFaultCode: (data: MasterDataCreateInput) => Promise<FaultCode>;
  updateFaultCode: (id: string, data: MasterDataUpdateInput) => Promise<FaultCode>;
  deleteFaultCode: (id: string) => Promise<FaultCode>;
  getFaultCodeUsage: (id: string) => Promise<UsageInfo>;

  // Actions - Reason management
  createReason: (data: MasterDataCreateInput) => Promise<Reason>;
  updateReason: (id: string, data: MasterDataUpdateInput) => Promise<Reason>;
  deleteReason: (id: string) => Promise<Reason>;
  getReasonUsage: (id: string) => Promise<UsageInfo>;

  // Actions - Priority Level management
  createPriorityLevel: (data: MasterDataCreateInput) => Promise<PriorityLevel>;
  updatePriorityLevel: (id: string, data: MasterDataUpdateInput) => Promise<PriorityLevel>;
  deletePriorityLevel: (id: string) => Promise<PriorityLevel>;
  getPriorityLevelUsage: (id: string) => Promise<UsageInfo>;

  // Actions - UI state management
  setCurrentType: (type: 'integrated-categories' | 'locations' | 'fault-codes' | 'priority-levels') => void;
  updateFilters: (filters: Partial<MasterDataListQuery>) => void;
  updateSearchQuery: (query: string) => void;
  clearError: () => void;
  reset: () => void;
}

export const useSettingsManagementStore = create<SettingsManagementState>()(
  devtools(
    (set, get) => ({
      // Initial state
      categories: [],
      locations: [],
      faultCodes: [],
      reasons: [],
      priorityLevels: [],
      categoriesTotal: 0,
      locationsTotal: 0,
      faultCodesTotal: 0,
      reasonsTotal: 0,
      priorityLevelsTotal: 0,
      page: 1,
      limit: 20,
      currentType: 'integrated-categories',
      filters: { page: 1, limit: 20 },
      searchQuery: '',
      isLoading: false,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isInitialized: false,
      error: null,

      // Data fetching actions
      fetchCategories: async (query) => {
        set({ isLoading: true, error: null });
        try {
          const finalQuery = { ...get().filters, ...query };
          const response = await SettingsService.getCategories(finalQuery);
          set({ 
            categories: response.items, 
            categoriesTotal: response.total,
            page: response.page,
            filters: finalQuery,
            isLoading: false,
            isInitialized: true
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch categories',
            isLoading: false 
          });
        }
      },

      fetchLocations: async (query) => {
        set({ isLoading: true, error: null });
        try {
          const finalQuery = { ...get().filters, ...query };
          const response = await SettingsService.getLocations(finalQuery);
          set({ 
            locations: response.items, 
            locationsTotal: response.total,
            page: response.page,
            filters: finalQuery,
            isLoading: false,
            isInitialized: true
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch locations',
            isLoading: false 
          });
        }
      },

      fetchFaultCodes: async (query) => {
        set({ isLoading: true, error: null });
        try {
          const finalQuery = { ...get().filters, ...query };
          const response = await SettingsService.getFaultCodes(finalQuery);
          set({ 
            faultCodes: response.items, 
            faultCodesTotal: response.total,
            page: response.page,
            filters: finalQuery,
            isLoading: false,
            isInitialized: true
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch fault codes',
            isLoading: false 
          });
        }
      },

      fetchReasons: async (query) => {
        set({ isLoading: true, error: null });
        try {
          const finalQuery = { ...get().filters, ...query };
          const response = await SettingsService.getReasons(finalQuery);
          set({ 
            reasons: response.items, 
            reasonsTotal: response.total,
            page: response.page,
            filters: finalQuery,
            isLoading: false,
            isInitialized: true
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch reasons',
            isLoading: false 
          });
        }
      },

      fetchPriorityLevels: async (query) => {
        set({ isLoading: true, error: null });
        try {
          const finalQuery = { ...get().filters, ...query };
          const response = await SettingsService.getPriorityLevels(finalQuery);
          set({ 
            priorityLevels: response.items, 
            priorityLevelsTotal: response.total,
            page: response.page,
            filters: finalQuery,
            isLoading: false,
            isInitialized: true
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch priority levels',
            isLoading: false 
          });
        }
      },

      refreshCurrentType: async () => {
        const { currentType, filters } = get();
        switch (currentType) {
          case 'integrated-categories':
            // No refresh needed, integrated view handles its own data
            break;
          case 'locations':
            await get().fetchLocations(filters);
            break;
          case 'fault-codes':
            await get().fetchFaultCodes(filters);
            break;
          case 'priority-levels':
            await get().fetchPriorityLevels(filters);
            break;
        }
      },

      // Category management
      createCategory: async (data) => {
        set({ isCreating: true, error: null });
        try {
          const category = await SettingsService.createCategory(data);
          await get().refreshCurrentType();
          set({ isCreating: false });
          return category;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create category',
            isCreating: false 
          });
          throw error;
        }
      },

      updateCategory: async (id, data) => {
        set({ isUpdating: true, error: null });
        try {
          const category = await SettingsService.updateCategory(id, data);
          await get().refreshCurrentType();
          set({ isUpdating: false });
          return category;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update category',
            isUpdating: false 
          });
          throw error;
        }
      },

      deleteCategory: async (id) => {
        set({ isDeleting: true, error: null });
        try {
          const category = await SettingsService.deleteCategory(id);
          await get().refreshCurrentType();
          set({ isDeleting: false });
          return category;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete category',
            isDeleting: false 
          });
          throw error;
        }
      },

      getCategoryUsage: async (id) => {
        try {
          return await SettingsService.getCategoryUsage(id);
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to get category usage' });
          throw error;
        }
      },

      // Location management
      createLocation: async (data) => {
        set({ isCreating: true, error: null });
        try {
          const location = await SettingsService.createLocation(data);
          await get().refreshCurrentType();
          set({ isCreating: false });
          return location;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create location',
            isCreating: false 
          });
          throw error;
        }
      },

      updateLocation: async (id, data) => {
        set({ isUpdating: true, error: null });
        try {
          const location = await SettingsService.updateLocation(id, data);
          await get().refreshCurrentType();
          set({ isUpdating: false });
          return location;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update location',
            isUpdating: false 
          });
          throw error;
        }
      },

      deleteLocation: async (id) => {
        set({ isDeleting: true, error: null });
        try {
          const location = await SettingsService.deleteLocation(id);
          await get().refreshCurrentType();
          set({ isDeleting: false });
          return location;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete location',
            isDeleting: false 
          });
          throw error;
        }
      },

      getLocationUsage: async (id) => {
        try {
          return await SettingsService.getLocationUsage(id);
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to get location usage' });
          throw error;
        }
      },

      // Fault Code management
      createFaultCode: async (data) => {
        set({ isCreating: true, error: null });
        try {
          const faultCode = await SettingsService.createFaultCode(data);
          await get().refreshCurrentType();
          set({ isCreating: false });
          return faultCode;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create fault code',
            isCreating: false 
          });
          throw error;
        }
      },

      updateFaultCode: async (id, data) => {
        set({ isUpdating: true, error: null });
        try {
          const faultCode = await SettingsService.updateFaultCode(id, data);
          await get().refreshCurrentType();
          set({ isUpdating: false });
          return faultCode;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update fault code',
            isUpdating: false 
          });
          throw error;
        }
      },

      deleteFaultCode: async (id) => {
        set({ isDeleting: true, error: null });
        try {
          const faultCode = await SettingsService.deleteFaultCode(id);
          await get().refreshCurrentType();
          set({ isDeleting: false });
          return faultCode;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete fault code',
            isDeleting: false 
          });
          throw error;
        }
      },

      getFaultCodeUsage: async (id) => {
        try {
          return await SettingsService.getFaultCodeUsage(id);
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to get fault code usage' });
          throw error;
        }
      },

      // Reason management
      createReason: async (data) => {
        set({ isCreating: true, error: null });
        try {
          const reason = await SettingsService.createReason(data);
          await get().refreshCurrentType();
          set({ isCreating: false });
          return reason;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create reason',
            isCreating: false 
          });
          throw error;
        }
      },

      updateReason: async (id, data) => {
        set({ isUpdating: true, error: null });
        try {
          const reason = await SettingsService.updateReason(id, data);
          await get().refreshCurrentType();
          set({ isUpdating: false });
          return reason;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update reason',
            isUpdating: false 
          });
          throw error;
        }
      },

      deleteReason: async (id) => {
        set({ isDeleting: true, error: null });
        try {
          const reason = await SettingsService.deleteReason(id);
          await get().refreshCurrentType();
          set({ isDeleting: false });
          return reason;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete reason',
            isDeleting: false 
          });
          throw error;
        }
      },

      getReasonUsage: async (id) => {
        try {
          return await SettingsService.getReasonUsage(id);
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to get reason usage' });
          throw error;
        }
      },

      // Priority Level management
      createPriorityLevel: async (data) => {
        set({ isCreating: true, error: null });
        try {
          const priorityLevel = await SettingsService.createPriorityLevel(data);
          await get().refreshCurrentType();
          set({ isCreating: false });
          return priorityLevel;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create priority level',
            isCreating: false 
          });
          throw error;
        }
      },

      updatePriorityLevel: async (id, data) => {
        set({ isUpdating: true, error: null });
        try {
          const priorityLevel = await SettingsService.updatePriorityLevel(id, data);
          await get().refreshCurrentType();
          set({ isUpdating: false });
          return priorityLevel;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update priority level',
            isUpdating: false 
          });
          throw error;
        }
      },

      deletePriorityLevel: async (id) => {
        set({ isDeleting: true, error: null });
        try {
          const priorityLevel = await SettingsService.deletePriorityLevel(id);
          await get().refreshCurrentType();
          set({ isDeleting: false });
          return priorityLevel;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete priority level',
            isDeleting: false 
          });
          throw error;
        }
      },

      getPriorityLevelUsage: async (id) => {
        try {
          return await SettingsService.getPriorityLevelUsage(id);
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to get priority level usage' });
          throw error;
        }
      },

      // UI state management
      setCurrentType: (type) => {
        set({ currentType: type, isInitialized: false });
      },

      updateFilters: (newFilters) => {
        set({ filters: { ...get().filters, ...newFilters } });
      },

      updateSearchQuery: (query) => {
        set({ searchQuery: query, filters: { ...get().filters, search: query || undefined } });
      },

      clearError: () => set({ error: null }),

      reset: () => set({
        categories: [],
        locations: [],
        faultCodes: [],
        reasons: [],
        priorityLevels: [],
        categoriesTotal: 0,
        locationsTotal: 0,
        faultCodesTotal: 0,
        reasonsTotal: 0,
        priorityLevelsTotal: 0,
        page: 1,
        limit: 20,
        currentType: 'integrated-categories',
        filters: { page: 1, limit: 20 },
        searchQuery: '',
        isLoading: false,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
        isInitialized: false,
        error: null,
      }),
    }),
    {
      name: 'settings-management-store',
    }
  )
);