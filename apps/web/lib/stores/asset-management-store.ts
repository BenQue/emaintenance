import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { assetService, Asset, PaginatedAssets, AssetStats } from '../services/asset-service';

interface AssetFilters {
  location?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

interface AssetManagementState {
  // Data
  assets: Asset[];
  selectedAssets: Set<string>;
  currentAsset: Asset | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  
  // Statistics
  stats: AssetStats | null;
  locations: string[];
  
  // Filters and search
  filters: AssetFilters;
  searchQuery: string;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isBulkOperating: boolean;
  isLoadingStats: boolean;

  // Error handling
  error: string | null;

  // Actions - Data fetching
  fetchAssets: (filters?: AssetFilters) => Promise<void>;
  fetchAssetById: (id: string) => Promise<void>;
  fetchAssetStats: () => Promise<void>;
  fetchLocations: () => Promise<void>;
  refreshAssets: () => Promise<void>;

  // Actions - Asset management
  createAsset: (assetData: Partial<Asset>) => Promise<Asset>;
  updateAsset: (id: string, assetData: Partial<Asset>) => Promise<Asset>;
  updateAssetStatus: (id: string, isActive: boolean) => Promise<Asset>;
  deleteAsset: (id: string) => Promise<void>;

  // Actions - Bulk operations
  bulkUpdateStatus: (assetIds: string[], isActive: boolean) => Promise<void>;
  bulkDelete: (assetIds: string[]) => Promise<void>;

  // Actions - Selection
  selectAsset: (assetId: string) => void;
  deselectAsset: (assetId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleAssetSelection: (assetId: string) => void;

  // Actions - Search and filters
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<AssetFilters>) => void;
  clearFilters: () => void;
  clearError: () => void;
}

export const useAssetManagementStore = create<AssetManagementState>()(
  devtools(
    (set, get) => ({
      // Initial state
      assets: [],
      selectedAssets: new Set(),
      currentAsset: null,
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
      
      stats: null,
      locations: [],
      
      filters: { page: 1, limit: 10 },
      searchQuery: '',

      isLoading: false,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isBulkOperating: false,
      isLoadingStats: false,

      error: null,

      // Data fetching actions
      fetchAssets: async (filters?: AssetFilters) => {
        set({ isLoading: true, error: null });
        try {
          const currentFilters = { ...get().filters, ...filters };
          const result = await assetService.getAllAssets(currentFilters);
          
          set({
            assets: result.assets || [],
            total: result.total || 0,
            page: result.page || 1,
            limit: result.limit || 10,
            totalPages: result.totalPages || 0,
            filters: currentFilters,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch assets',
            isLoading: false,
          });
        }
      },

      fetchAssetById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const asset = await assetService.getAssetById(id);
          set({
            currentAsset: asset,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch asset',
            isLoading: false,
          });
        }
      },

      fetchAssetStats: async () => {
        set({ isLoadingStats: true });
        try {
          const stats = await assetService.getAssetStats();
          set({
            stats,
            isLoadingStats: false,
          });
        } catch (error) {
          console.error('Failed to fetch asset stats:', error);
          set({ isLoadingStats: false });
        }
      },

      fetchLocations: async () => {
        try {
          const result = await assetService.getLocations();
          set({
            locations: result.locations || [],
          });
        } catch (error) {
          console.error('Failed to fetch locations:', error);
        }
      },

      refreshAssets: async () => {
        const { filters } = get();
        await get().fetchAssets(filters);
        await get().fetchAssetStats();
      },

      // Asset management actions
      createAsset: async (assetData: Partial<Asset>) => {
        set({ isCreating: true, error: null });
        try {
          const newAsset = await assetService.createAsset(assetData);
          
          // Refresh the assets list and stats
          await get().refreshAssets();
          
          set({ isCreating: false });
          return newAsset;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create asset',
            isCreating: false,
          });
          throw error;
        }
      },

      updateAsset: async (id: string, assetData: Partial<Asset>) => {
        set({ isUpdating: true, error: null });
        try {
          const updatedAsset = await assetService.updateAsset(id, assetData);
          
          // Update the asset in the current list
          const { assets } = get();
          const updatedAssets = assets.map(asset =>
            asset.id === id ? updatedAsset : asset
          );
          
          set({
            assets: updatedAssets,
            currentAsset: updatedAsset,
            isUpdating: false,
          });
          
          // Refresh stats in case status changed
          await get().fetchAssetStats();
          
          return updatedAsset;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update asset',
            isUpdating: false,
          });
          throw error;
        }
      },

      updateAssetStatus: async (id: string, isActive: boolean) => {
        return get().updateAsset(id, { isActive });
      },

      deleteAsset: async (id: string) => {
        set({ isDeleting: true, error: null });
        try {
          await assetService.deleteAsset(id);
          
          // Remove from current list
          const { assets, selectedAssets } = get();
          const updatedAssets = assets.filter(asset => asset.id !== id);
          const updatedSelected = new Set(selectedAssets);
          updatedSelected.delete(id);
          
          set({
            assets: updatedAssets,
            selectedAssets: updatedSelected,
            total: get().total - 1,
            isDeleting: false,
          });
          
          // Refresh stats
          await get().fetchAssetStats();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete asset',
            isDeleting: false,
          });
          throw error;
        }
      },

      // Bulk operations
      bulkUpdateStatus: async (assetIds: string[], isActive: boolean) => {
        set({ isBulkOperating: true, error: null });
        try {
          // Update each asset individually (since we don't have a bulk API endpoint)
          await Promise.all(
            assetIds.map(id => assetService.updateAsset(id, { isActive }))
          );
          
          // Refresh the assets list
          await get().refreshAssets();
          
          set({ isBulkOperating: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update assets',
            isBulkOperating: false,
          });
          throw error;
        }
      },

      bulkDelete: async (assetIds: string[]) => {
        set({ isBulkOperating: true, error: null });
        try {
          // Delete each asset individually
          await Promise.all(
            assetIds.map(id => assetService.deleteAsset(id))
          );
          
          // Remove from current list
          const { assets, selectedAssets } = get();
          const updatedAssets = assets.filter(asset => !assetIds.includes(asset.id));
          
          set({
            assets: updatedAssets,
            selectedAssets: new Set(),
            total: get().total - assetIds.length,
            isBulkOperating: false,
          });
          
          // Refresh stats
          await get().fetchAssetStats();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete assets',
            isBulkOperating: false,
          });
          throw error;
        }
      },

      // Selection actions
      selectAsset: (assetId: string) => {
        const { selectedAssets } = get();
        const newSelected = new Set(selectedAssets);
        newSelected.add(assetId);
        set({ selectedAssets: newSelected });
      },

      deselectAsset: (assetId: string) => {
        const { selectedAssets } = get();
        const newSelected = new Set(selectedAssets);
        newSelected.delete(assetId);
        set({ selectedAssets: newSelected });
      },

      selectAll: () => {
        const { assets } = get();
        const allIds = new Set(assets.map(asset => asset.id));
        set({ selectedAssets: allIds });
      },

      deselectAll: () => {
        set({ selectedAssets: new Set() });
      },

      toggleAssetSelection: (assetId: string) => {
        const { selectedAssets } = get();
        if (selectedAssets.has(assetId)) {
          get().deselectAsset(assetId);
        } else {
          get().selectAsset(assetId);
        }
      },

      // Search and filter actions
      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      setFilters: (newFilters: Partial<AssetFilters>) => {
        const { filters } = get();
        const updatedFilters = { ...filters, ...newFilters };
        set({ filters: updatedFilters });
      },

      clearFilters: () => {
        set({
          filters: { page: 1, limit: 10 },
          searchQuery: '',
        });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'asset-management-store',
    }
  )
);