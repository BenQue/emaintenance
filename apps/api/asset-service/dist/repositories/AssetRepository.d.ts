import { PrismaClient, Asset } from '@emaintenance/database';
import { AssetDowntimeStatistics, AssetPerformanceRanking, AssetKPIFilters, AssetHealthMetrics } from '../types/asset';
export interface CreateAssetData {
    assetCode: string;
    name: string;
    description?: string;
    location: string;
    model?: string;
    manufacturer?: string;
    serialNumber?: string;
    installDate?: Date;
    isActive?: boolean;
}
export interface UpdateAssetData {
    assetCode?: string;
    name?: string;
    description?: string;
    location?: string;
    model?: string;
    manufacturer?: string;
    serialNumber?: string;
    installDate?: Date;
    isActive?: boolean;
}
export interface AssetListFilters {
    page?: number;
    limit?: number;
    search?: string;
    location?: string;
    isActive?: boolean;
    sortBy?: 'name' | 'assetCode' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
}
export interface AssetListResult {
    assets: Asset[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export declare class AssetRepository {
    private prisma;
    constructor(prisma: PrismaClient);
    /**
     * Create a new asset
     */
    createAsset(data: CreateAssetData): Promise<Asset>;
    /**
     * Get asset by ID
     */
    getAssetById(id: string): Promise<Asset | null>;
    /**
     * Get asset by asset code
     */
    getAssetByCode(assetCode: string): Promise<Asset | null>;
    /**
     * Update asset
     */
    updateAsset(id: string, data: UpdateAssetData): Promise<Asset>;
    /**
     * Delete asset
     */
    deleteAsset(id: string): Promise<void>;
    /**
     * List assets with pagination and filtering
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
     * Validate if asset code exists
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
     * Get asset maintenance history
     */
    getAssetMaintenanceHistory(assetId: string): Promise<any[]>;
    getAssetDowntimeStatistics(filters?: AssetKPIFilters): Promise<AssetDowntimeStatistics[]>;
    getAssetPerformanceRanking(filters?: AssetKPIFilters): Promise<AssetPerformanceRanking[]>;
    getAssetHealthMetrics(filters?: AssetKPIFilters): Promise<AssetHealthMetrics>;
    private buildWhereClause;
}
//# sourceMappingURL=AssetRepository.d.ts.map