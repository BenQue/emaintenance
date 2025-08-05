import { PrismaClient, Asset, AssetStatus } from '@emaintanance/database';
import { AssetDowntimeStatistics, AssetPerformanceRanking, AssetKPIFilters, AssetHealthMetrics } from '../types/asset';
export interface CreateAssetData {
    assetCode: string;
    name: string;
    description?: string;
    location: string;
    category: string;
    serialNumber?: string;
    status?: AssetStatus;
}
export interface UpdateAssetData {
    assetCode?: string;
    name?: string;
    description?: string;
    location?: string;
    category?: string;
    serialNumber?: string;
    status?: AssetStatus;
}
export interface AssetListFilters {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    location?: string;
    status?: AssetStatus;
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
        category?: string;
        location?: string;
        status?: AssetStatus;
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