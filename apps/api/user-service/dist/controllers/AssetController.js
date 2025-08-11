"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetController = void 0;
const AssetService_1 = require("../services/AssetService");
const validation_1 = require("../utils/validation");
const errorHandler_1 = require("../utils/errorHandler");
class AssetController {
    assetService;
    constructor() {
        this.assetService = new AssetService_1.AssetService();
    }
    /**
     * Create a new asset
     */
    createAsset = async (req, res) => {
        try {
            // Validate input
            const validationResult = validation_1.createAssetSchema.safeParse(req.body);
            if (!validationResult.success) {
                const errorMessage = `Validation failed: ${(0, errorHandler_1.formatValidationErrors)(validationResult.error)}`;
                return res.status(400).json((0, errorHandler_1.createErrorResponse)(errorMessage, 400));
            }
            const assetData = validationResult.data;
            // Create asset
            const asset = await this.assetService.createAsset(assetData);
            res.status(201).json((0, errorHandler_1.createSuccessResponse)(asset));
        }
        catch (error) {
            console.error('Create asset error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create asset';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Get asset by ID
     */
    getAssetById = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('Asset ID is required', 400));
            }
            const asset = await this.assetService.getAssetById(id);
            if (!asset) {
                return res.status(404).json((0, errorHandler_1.createErrorResponse)('Asset not found', 404));
            }
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(asset));
        }
        catch (error) {
            console.error('Get asset error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to get asset';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Get asset by code (for QR scanning)
     */
    getAssetByCode = async (req, res) => {
        try {
            const { code } = req.params;
            if (!code) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('Asset code is required', 400));
            }
            const asset = await this.assetService.getAssetByCode(code);
            if (!asset) {
                return res.status(404).json((0, errorHandler_1.createErrorResponse)('Asset not found', 404));
            }
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(asset));
        }
        catch (error) {
            console.error('Get asset by code error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to get asset by code';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * List assets with pagination and filtering
     */
    listAssets = async (req, res) => {
        try {
            // Validate query parameters
            const validationResult = validation_1.assetListQuerySchema.safeParse(req.query);
            if (!validationResult.success) {
                const errorMessage = `Validation failed: ${(0, errorHandler_1.formatValidationErrors)(validationResult.error)}`;
                return res.status(400).json((0, errorHandler_1.createErrorResponse)(errorMessage, 400));
            }
            const queryParams = validationResult.data;
            // Get assets
            const result = await this.assetService.listAssets(queryParams);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)({
                assets: result.assets,
                pagination: {
                    currentPage: result.currentPage,
                    totalPages: result.totalPages,
                    total: result.total,
                    limit: queryParams.limit || 20,
                },
            }));
        }
        catch (error) {
            console.error('List assets error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to list assets';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Update asset
     */
    updateAsset = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('Asset ID is required', 400));
            }
            // Validate input
            const validationResult = validation_1.updateAssetSchema.safeParse(req.body);
            if (!validationResult.success) {
                const errorMessage = `Validation failed: ${(0, errorHandler_1.formatValidationErrors)(validationResult.error)}`;
                return res.status(400).json((0, errorHandler_1.createErrorResponse)(errorMessage, 400));
            }
            const assetData = validationResult.data;
            // Update asset
            const asset = await this.assetService.updateAsset(id, assetData);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(asset));
        }
        catch (error) {
            console.error('Update asset error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update asset';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Delete asset (soft delete)
     */
    deleteAsset = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('Asset ID is required', 400));
            }
            // Delete asset
            const asset = await this.assetService.deleteAsset(id);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)({
                message: 'Asset deleted successfully',
                asset,
            }));
        }
        catch (error) {
            console.error('Delete asset error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete asset';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Bulk create assets
     */
    bulkCreateAssets = async (req, res) => {
        try {
            // Validate input
            const validationResult = validation_1.bulkCreateAssetsSchema.safeParse(req.body);
            if (!validationResult.success) {
                const errorMessage = `Validation failed: ${(0, errorHandler_1.formatValidationErrors)(validationResult.error)}`;
                return res.status(400).json((0, errorHandler_1.createErrorResponse)(errorMessage, 400));
            }
            const bulkData = validationResult.data;
            // Bulk create assets
            const result = await this.assetService.bulkCreateAssets(bulkData);
            // If there are errors, return them with partial success status
            if (result.errors.length > 0) {
                return res.status(207).json((0, errorHandler_1.createSuccessResponse)({
                    message: 'Bulk creation completed with errors',
                    created: result.created,
                    errors: result.errors,
                    summary: {
                        totalRequested: bulkData.assets.length,
                        successfullyCreated: result.created.length,
                        errors: result.errors.length,
                    },
                }));
            }
            res.status(201).json((0, errorHandler_1.createSuccessResponse)({
                message: 'All assets created successfully',
                created: result.created,
                summary: {
                    totalRequested: bulkData.assets.length,
                    successfullyCreated: result.created.length,
                    errors: 0,
                },
            }));
        }
        catch (error) {
            console.error('Bulk create assets error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create assets';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Update asset ownership
     */
    updateAssetOwnership = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('Asset ID is required', 400));
            }
            // Validate input
            const validationResult = validation_1.updateAssetOwnershipSchema.safeParse(req.body);
            if (!validationResult.success) {
                const errorMessage = `Validation failed: ${(0, errorHandler_1.formatValidationErrors)(validationResult.error)}`;
                return res.status(400).json((0, errorHandler_1.createErrorResponse)(errorMessage, 400));
            }
            const ownership = validationResult.data;
            const asset = await this.assetService.updateAssetOwnership(id, ownership);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(asset));
        }
        catch (error) {
            console.error('Update asset ownership error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update asset ownership';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Update asset status
     */
    updateAssetStatus = async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('Asset ID is required', 400));
            }
            // Validate input
            const validationResult = validation_1.updateAssetStatusSchema.safeParse(req.body);
            if (!validationResult.success) {
                const errorMessage = `Validation failed: ${(0, errorHandler_1.formatValidationErrors)(validationResult.error)}`;
                return res.status(400).json((0, errorHandler_1.createErrorResponse)(errorMessage, 400));
            }
            const { isActive } = validationResult.data;
            const asset = await this.assetService.updateAssetStatus(id, isActive);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(asset));
        }
        catch (error) {
            console.error('Update asset status error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update asset status';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Bulk operations on assets
     */
    bulkOperation = async (req, res) => {
        try {
            // Validate input
            const validationResult = validation_1.bulkAssetOperationSchema.safeParse(req.body);
            if (!validationResult.success) {
                const errorMessage = `Validation failed: ${(0, errorHandler_1.formatValidationErrors)(validationResult.error)}`;
                return res.status(400).json((0, errorHandler_1.createErrorResponse)(errorMessage, 400));
            }
            const operation = validationResult.data;
            const result = await this.assetService.bulkOperation(operation);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(result));
        }
        catch (error) {
            console.error('Bulk operation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to perform bulk operation';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Search assets by query
     */
    searchAssets = async (req, res) => {
        try {
            const { q, limit } = req.query;
            if (!q || typeof q !== 'string' || q.trim().length < 2) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('Search query must be at least 2 characters', 400));
            }
            const searchLimit = limit && typeof limit === 'string' ? parseInt(limit, 10) : 20;
            if (isNaN(searchLimit) || searchLimit < 1 || searchLimit > 100) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('Limit must be between 1 and 100', 400));
            }
            const assets = await this.assetService.searchAssets(q.trim(), searchLimit);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(assets));
        }
        catch (error) {
            console.error('Search assets error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to search assets';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Get assets by location
     */
    getAssetsByLocation = async (req, res) => {
        try {
            const { location } = req.params;
            if (!location) {
                return res.status(400).json((0, errorHandler_1.createErrorResponse)('Location is required', 400));
            }
            const assets = await this.assetService.getAssetsByLocation(location);
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(assets));
        }
        catch (error) {
            console.error('Get assets by location error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to get assets by location';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Get available locations
     */
    getLocations = async (req, res) => {
        try {
            const locations = await this.assetService.getLocations();
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(locations));
        }
        catch (error) {
            console.error('Get locations error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to get locations';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
    /**
     * Get asset statistics
     */
    getAssetStats = async (req, res) => {
        try {
            const stats = await this.assetService.getAssetStats();
            res.status(200).json((0, errorHandler_1.createSuccessResponse)(stats));
        }
        catch (error) {
            console.error('Get asset stats error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to get asset statistics';
            const statusCode = error instanceof Error ? (0, errorHandler_1.getErrorStatusCode)(error) : 500;
            res.status(statusCode).json((0, errorHandler_1.createErrorResponse)(errorMessage, statusCode));
        }
    };
}
exports.AssetController = AssetController;
