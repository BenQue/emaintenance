import { Request, Response } from 'express';
import { AssetService } from '../services/AssetService';
import { 
  createAssetSchema, 
  updateAssetSchema, 
  assetListQuerySchema, 
  bulkCreateAssetsSchema 
} from '../utils/validation';
import { ApiResponse } from '../types/auth';
import { formatValidationErrors, createErrorResponse, createSuccessResponse, getErrorStatusCode } from '../utils/errorHandler';

export class AssetController {
  private assetService: AssetService;

  constructor() {
    this.assetService = new AssetService();
  }

  /**
   * Create a new asset
   */
  createAsset = async (req: Request, res: Response) => {
    try {
      // Validate input
      const validationResult = createAssetSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const assetData = validationResult.data;

      // Create asset
      const asset = await this.assetService.createAsset(assetData);

      res.status(201).json(createSuccessResponse(asset));

    } catch (error) {
      console.error('Create asset error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create asset';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  /**
   * Get asset by ID
   */
  getAssetById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Asset ID is required', 400));
      }

      const asset = await this.assetService.getAssetById(id);

      if (!asset) {
        return res.status(404).json(createErrorResponse('Asset not found', 404));
      }

      res.status(200).json(createSuccessResponse(asset));

    } catch (error) {
      console.error('Get asset error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get asset';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  /**
   * List assets with pagination and filtering
   */
  listAssets = async (req: Request, res: Response) => {
    try {
      // Validate query parameters
      const validationResult = assetListQuerySchema.safeParse(req.query);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const queryParams = validationResult.data;

      // Get assets
      const result = await this.assetService.listAssets(queryParams);

      res.status(200).json(createSuccessResponse({
        assets: result.assets,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          total: result.total,
          limit: queryParams.limit || 20,
        },
      }));

    } catch (error) {
      console.error('List assets error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to list assets';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  /**
   * Update asset
   */
  updateAsset = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Asset ID is required', 400));
      }

      // Validate input
      const validationResult = updateAssetSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const assetData = validationResult.data;

      // Update asset
      const asset = await this.assetService.updateAsset(id, assetData);

      res.status(200).json(createSuccessResponse(asset));

    } catch (error) {
      console.error('Update asset error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to update asset';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  /**
   * Delete asset (soft delete)
   */
  deleteAsset = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json(createErrorResponse('Asset ID is required', 400));
      }

      // Delete asset
      const asset = await this.assetService.deleteAsset(id);

      res.status(200).json(createSuccessResponse({
        message: 'Asset deleted successfully',
        asset,
      }));

    } catch (error) {
      console.error('Delete asset error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete asset';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  /**
   * Bulk create assets
   */
  bulkCreateAssets = async (req: Request, res: Response) => {
    try {
      // Validate input
      const validationResult = bulkCreateAssetsSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = `Validation failed: ${formatValidationErrors(validationResult.error)}`;
        return res.status(400).json(createErrorResponse(errorMessage, 400));
      }

      const bulkData = validationResult.data;

      // Bulk create assets
      const result = await this.assetService.bulkCreateAssets(bulkData);

      // If there are errors, return them with partial success status
      if (result.errors.length > 0) {
        return res.status(207).json(createSuccessResponse({
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

      res.status(201).json(createSuccessResponse({
        message: 'All assets created successfully',
        created: result.created,
        summary: {
          totalRequested: bulkData.assets.length,
          successfullyCreated: result.created.length,
          errors: 0,
        },
      }));

    } catch (error) {
      console.error('Bulk create assets error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create assets';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };

  /**
   * Get asset statistics
   */
  getAssetStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.assetService.getAssetStats();

      res.status(200).json(createSuccessResponse(stats));

    } catch (error) {
      console.error('Get asset stats error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to get asset statistics';
      const statusCode = error instanceof Error ? getErrorStatusCode(error) : 500;

      res.status(statusCode).json(createErrorResponse(errorMessage, statusCode));
    }
  };
}