import { Request, Response } from 'express';
export declare class AssetController {
    private assetService;
    constructor();
    /**
     * Create a new asset
     */
    createAsset: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get asset by ID
     */
    getAssetById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * List assets with pagination and filtering
     */
    listAssets: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Update asset
     */
    updateAsset: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Delete asset (soft delete)
     */
    deleteAsset: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Bulk create assets
     */
    bulkCreateAssets: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Update asset ownership
     */
    updateAssetOwnership: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Update asset status
     */
    updateAssetStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Bulk operations on assets
     */
    bulkOperation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Search assets by query
     */
    searchAssets: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get assets by location
     */
    getAssetsByLocation: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get available locations
     */
    getLocations: (req: Request, res: Response) => Promise<void>;
    /**
     * Get asset statistics
     */
    getAssetStats: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=AssetController.d.ts.map