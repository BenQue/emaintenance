import { Request, Response } from 'express';
import { PrismaClient } from '@emaintanance/database';
export declare class AssetController {
    private prisma;
    private assetService;
    constructor(prisma: PrismaClient);
    getDowntimeRanking(req: Request, res: Response): Promise<void>;
    getFaultFrequencyRanking(req: Request, res: Response): Promise<void>;
    /**
     * Create a new asset
     */
    createAsset(req: Request, res: Response): Promise<void>;
    /**
     * Get asset by ID
     */
    getAssetById(req: Request, res: Response): Promise<void>;
    /**
     * Update asset
     */
    updateAsset(req: Request, res: Response): Promise<void>;
    /**
     * Delete asset
     */
    deleteAsset(req: Request, res: Response): Promise<void>;
    /**
     * List assets with pagination and filtering
     */
    listAssets(req: Request, res: Response): Promise<void>;
    /**
     * Search assets
     */
    searchAssets(req: Request, res: Response): Promise<void>;
    /**
     * Generate QR code for asset
     */
    generateQRCode(req: Request, res: Response): Promise<void>;
    /**
     * Get asset maintenance history
     */
    getMaintenanceHistory(req: Request, res: Response): Promise<void>;
    getMaintenanceCostAnalysis(req: Request, res: Response): Promise<void>;
    getHealthOverview(req: Request, res: Response): Promise<void>;
    getPerformanceRanking(req: Request, res: Response): Promise<void>;
    getCriticalAssets(req: Request, res: Response): Promise<void>;
    private parseKPIFilters;
    private parseListFilters;
}
//# sourceMappingURL=AssetController.d.ts.map