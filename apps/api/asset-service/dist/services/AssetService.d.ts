import { PrismaClient, Asset } from '@emaintenance/database';
import { CreateAssetData, UpdateAssetData, AssetListFilters, AssetListResult } from '../repositories/AssetRepository';
import { AssetDowntimeStatistics, AssetPerformanceRanking, AssetKPIFilters, AssetHealthMetrics } from '../types/asset';
export declare class AssetService {
    private prisma;
    private assetRepository;
    constructor(prisma: PrismaClient);
    /**
     * Create a new asset
     */
    createAsset(data: CreateAssetData): Promise<Asset>;
    /**
     * Get asset by ID
     */
    getAssetById(id: string): Promise<Asset>;
    /**
     * Get asset by code
     */
    getAssetByCode(assetCode: string): Promise<Asset>;
    /**
     * Update asset
     */
    updateAsset(id: string, data: UpdateAssetData): Promise<Asset>;
    /**
     * Delete asset
     */
    deleteAsset(id: string): Promise<void>;
    /**
     * List assets with filtering and pagination
     */
    listAssets(filters?: AssetListFilters): Promise<AssetListResult>;
    /**
     * Search assets
     */
    searchAssets(query: string, filters?: {
        location?: string;
        isActive?: boolean;
        limit?: number;
    }): Promise<Asset[]>;
    /**
     * Search assets by partial code for autocomplete
     */
    searchAssetsByCode(partialCode: string, filters?: {
        location?: string;
        isActive?: boolean;
        limit?: number;
    }): Promise<Asset[]>;
    /**
     * Validate asset code
     */
    validateAssetCode(assetCode: string): Promise<{
        exists: boolean;
        asset?: Asset;
    }>;
    /**
     * Get asset suggestions with fuzzy matching
     */
    getAssetSuggestions(input: string, filters?: {
        location?: string;
        isActive?: boolean;
        limit?: number;
    }): Promise<Asset[]>;
    /**
     * Generate QR code for asset
     */
    generateAssetQRCode(id: string): Promise<string>;
    /**
     * Get asset maintenance history
     */
    getAssetMaintenanceHistory(id: string): Promise<any[]>;
    getDowntimeStatistics(filters?: AssetKPIFilters): Promise<AssetDowntimeStatistics[]>;
    getDowntimeRanking(filters?: AssetKPIFilters): Promise<AssetDowntimeStatistics[]>;
    getFaultFrequencyRanking(filters?: AssetKPIFilters): Promise<AssetPerformanceRanking[]>;
    getMaintenanceCostAnalysis(filters?: AssetKPIFilters): Promise<AssetPerformanceRanking[]>;
    getHealthOverview(filters?: AssetKPIFilters): Promise<AssetHealthMetrics>;
    getPerformanceRanking(filters?: AssetKPIFilters): Promise<AssetPerformanceRanking[]>;
    getCriticalAssets(filters?: AssetKPIFilters): Promise<AssetPerformanceRanking[]>;
    /**
     * Get unique asset locations
     */
    getUniqueLocations(): Promise<string[]>;
    /**
     * Get general asset statistics for dashboard
     */
    getAssetStatistics(): Promise<{
        total: number;
        active: number;
        inactive: number;
        locations: number;
        byLocation: Record<string, number>;
        byManufacturer: Record<string, number>;
    }>;
}
//# sourceMappingURL=AssetService.d.ts.map