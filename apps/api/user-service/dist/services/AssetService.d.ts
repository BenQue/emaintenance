import { Asset } from '@emaintenance/database';
import { AssetListOptions } from '../repositories/AssetRepository';
import { CreateAssetInput, UpdateAssetInput, BulkCreateAssetsInput } from '../utils/validation';
export interface BulkAssetOperation {
    assetIds: string[];
    operation: 'activate' | 'deactivate' | 'delete';
}
export interface AssetOwnershipUpdate {
    ownerId?: string;
    administratorId?: string;
}
export declare class AssetService {
    private assetRepository;
    constructor();
    /**
     * Create a new asset
     */
    createAsset(assetData: CreateAssetInput): Promise<Asset>;
    /**
     * Get asset by ID
     */
    getAssetById(id: string): Promise<Asset | null>;
    /**
     * Get asset by asset code
     */
    getAssetByCode(assetCode: string): Promise<Asset | null>;
    /**
     * List assets with pagination and filtering
     */
    listAssets(options?: AssetListOptions): Promise<{
        assets: Asset[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    /**
     * Update asset
     */
    updateAsset(id: string, assetData: UpdateAssetInput): Promise<Asset>;
    /**
     * Delete asset (soft delete)
     */
    deleteAsset(id: string): Promise<Asset>;
    /**
     * Bulk create assets
     */
    bulkCreateAssets(bulkData: BulkCreateAssetsInput): Promise<{
        created: Asset[];
        errors: Array<{
            index: number;
            assetCode: string;
            error: string;
        }>;
    }>;
    /**
     * Update asset ownership
     */
    updateAssetOwnership(id: string, ownership: AssetOwnershipUpdate): Promise<Asset>;
    /**
     * Update asset status
     */
    updateAssetStatus(id: string, isActive: boolean): Promise<Asset>;
    /**
     * Bulk operations on assets
     */
    bulkOperation(operation: BulkAssetOperation): Promise<{
        success: number;
        failed: number;
        errors: string[];
    }>;
    /**
     * Search assets by query
     */
    searchAssets(query: string, limit?: number): Promise<Asset[]>;
    /**
     * Get assets by location (for dropdowns)
     */
    getAssetsByLocation(location: string): Promise<Asset[]>;
    /**
     * Get available locations
     */
    getLocations(): Promise<string[]>;
    /**
     * Get asset statistics
     */
    getAssetStats(): Promise<{
        total: number;
        active: number;
        inactive: number;
        byLocation: Record<string, number>;
    }>;
}
//# sourceMappingURL=AssetService.d.ts.map