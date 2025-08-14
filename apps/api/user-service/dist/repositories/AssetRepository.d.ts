import { Asset } from '@emaintenance/database';
export interface CreateAssetData {
    assetCode: string;
    name: string;
    description?: string;
    model?: string;
    manufacturer?: string;
    serialNumber?: string;
    location: string;
    installDate?: Date;
    ownerId?: string;
    administratorId?: string;
}
export interface UpdateAssetData {
    assetCode?: string;
    name?: string;
    description?: string;
    model?: string;
    manufacturer?: string;
    serialNumber?: string;
    location?: string;
    installDate?: Date;
    ownerId?: string;
    administratorId?: string;
    isActive?: boolean;
}
export interface AssetListOptions {
    page?: number;
    limit?: number;
    location?: string;
    isActive?: boolean;
    ownerId?: string;
    administratorId?: string;
}
export declare class AssetRepository {
    /**
     * Create a new asset
     */
    create(assetData: CreateAssetData): Promise<Asset>;
    /**
     * Find asset by ID
     */
    findById(id: string): Promise<Asset | null>;
    /**
     * Find asset by asset code
     */
    findByAssetCode(assetCode: string): Promise<Asset | null>;
    /**
     * List assets with pagination and filtering
     */
    findMany(options?: AssetListOptions): Promise<{
        assets: Asset[];
        total: number;
        totalPages: number;
    }>;
    /**
     * Update asset
     */
    update(id: string, assetData: UpdateAssetData): Promise<Asset | null>;
    /**
     * Delete asset (soft delete by setting isActive to false)
     */
    delete(id: string): Promise<Asset | null>;
    /**
     * Check if asset code already exists
     */
    assetCodeExists(assetCode: string, excludeId?: string): Promise<boolean>;
    /**
     * Bulk create assets
     */
    bulkCreate(assetsData: CreateAssetData[]): Promise<Asset[]>;
    /**
     * Check if user exists (for ownership validation)
     */
    userExists(userId: string): Promise<boolean>;
    /**
     * Check if asset has active work orders
     */
    hasActiveWorkOrders(assetId: string): Promise<boolean>;
    /**
     * Search assets by query
     */
    search(query: string, limit: number): Promise<Asset[]>;
    /**
     * Find assets by location
     */
    findByLocation(location: string): Promise<Asset[]>;
    /**
     * Get distinct locations
     */
    getDistinctLocations(): Promise<string[]>;
}
//# sourceMappingURL=AssetRepository.d.ts.map