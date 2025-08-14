import { Asset } from '@emaintenance/database';
import { AssetRepository, CreateAssetData, UpdateAssetData, AssetListOptions } from '../repositories/AssetRepository';
import { CreateAssetInput, UpdateAssetInput, BulkCreateAssetsInput } from '../utils/validation';

export interface BulkAssetOperation {
  assetIds: string[];
  operation: 'activate' | 'deactivate' | 'delete';
}

export interface AssetOwnershipUpdate {
  ownerId?: string;
  administratorId?: string;
}

export class AssetService {
  private assetRepository: AssetRepository;

  constructor() {
    this.assetRepository = new AssetRepository();
  }

  /**
   * Create a new asset
   */
  async createAsset(assetData: CreateAssetInput): Promise<Asset> {
    // Check if asset code already exists
    const existingAsset = await this.assetRepository.assetCodeExists(assetData.assetCode);
    if (existingAsset) {
      throw new Error('Asset code already exists');
    }

    // Convert install date string to Date if provided
    const createData: CreateAssetData = {
      ...assetData,
      installDate: assetData.installDate ? new Date(assetData.installDate) : undefined,
    };

    return this.assetRepository.create(createData);
  }

  /**
   * Get asset by ID
   */
  async getAssetById(id: string): Promise<Asset | null> {
    return this.assetRepository.findById(id);
  }

  /**
   * Get asset by asset code
   */
  async getAssetByCode(assetCode: string): Promise<Asset | null> {
    return this.assetRepository.findByAssetCode(assetCode);
  }

  /**
   * List assets with pagination and filtering
   */
  async listAssets(options: AssetListOptions = {}): Promise<{ assets: Asset[]; total: number; totalPages: number; currentPage: number }> {
    // Set default values
    const {
      page = 1,
      limit = 20,
      ...filterOptions
    } = options;

    // Validate pagination parameters
    if (page < 1) {
      throw new Error('Page must be greater than 0');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    const result = await this.assetRepository.findMany({
      page,
      limit,
      ...filterOptions,
    });

    return {
      ...result,
      currentPage: page,
    };
  }

  /**
   * Update asset
   */
  async updateAsset(id: string, assetData: UpdateAssetInput): Promise<Asset> {
    // Check if asset exists
    const existingAsset = await this.assetRepository.findById(id);
    if (!existingAsset) {
      throw new Error('Asset not found');
    }

    // Check if asset code already exists (excluding current asset)
    if (assetData.assetCode) {
      const codeExists = await this.assetRepository.assetCodeExists(assetData.assetCode, id);
      if (codeExists) {
        throw new Error('Asset code already exists');
      }
    }

    // Convert install date string to Date if provided
    const updateData: UpdateAssetData = {
      ...assetData,
      installDate: assetData.installDate ? new Date(assetData.installDate) : undefined,
    };

    const updatedAsset = await this.assetRepository.update(id, updateData);
    if (!updatedAsset) {
      throw new Error('Failed to update asset');
    }

    return updatedAsset;
  }

  /**
   * Delete asset (soft delete)
   */
  async deleteAsset(id: string): Promise<Asset> {
    // Check if asset exists
    const existingAsset = await this.assetRepository.findById(id);
    if (!existingAsset) {
      throw new Error('Asset not found');
    }

    if (!existingAsset.isActive) {
      throw new Error('Asset is already deleted');
    }

    const deletedAsset = await this.assetRepository.delete(id);
    if (!deletedAsset) {
      throw new Error('Failed to delete asset');
    }

    return deletedAsset;
  }

  /**
   * Bulk create assets
   */
  async bulkCreateAssets(bulkData: BulkCreateAssetsInput): Promise<{ 
    created: Asset[]; 
    errors: Array<{ index: number; assetCode: string; error: string }> 
  }> {
    const { assets } = bulkData;
    const errors: Array<{ index: number; assetCode: string; error: string }> = [];
    
    // Validate all asset codes are unique within the batch
    const assetCodes = assets.map(asset => asset.assetCode);
    const duplicateCodes = assetCodes.filter((code, index) => assetCodes.indexOf(code) !== index);
    
    if (duplicateCodes.length > 0) {
      throw new Error(`Duplicate asset codes in batch: ${duplicateCodes.join(', ')}`);
    }

    // Check for existing asset codes in database
    const existingChecks = await Promise.all(
      assets.map(async (asset, index) => {
        const exists = await this.assetRepository.assetCodeExists(asset.assetCode);
        return { index, assetCode: asset.assetCode, exists };
      })
    );

    const existingCodes = existingChecks.filter(check => check.exists);
    if (existingCodes.length > 0) {
      existingCodes.forEach(({ index, assetCode }) => {
        errors.push({
          index,
          assetCode,
          error: 'Asset code already exists',
        });
      });
    }

    // If there are validation errors, return them without creating any assets
    if (errors.length > 0) {
      return { created: [], errors };
    }

    try {
      // Convert asset data for repository
      const createDataArray: CreateAssetData[] = assets.map(asset => ({
        ...asset,
        installDate: asset.installDate ? new Date(asset.installDate) : undefined,
      }));

      const created = await this.assetRepository.bulkCreate(createDataArray);
      return { created, errors: [] };
    } catch (error) {
      throw new Error(`Failed to create assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update asset ownership
   */
  async updateAssetOwnership(id: string, ownership: AssetOwnershipUpdate): Promise<Asset> {
    // Check if asset exists
    const existingAsset = await this.assetRepository.findById(id);
    if (!existingAsset) {
      throw new Error('Asset not found');
    }

    // Validate user IDs exist if provided
    if (ownership.ownerId) {
      const ownerExists = await this.assetRepository.userExists(ownership.ownerId);
      if (!ownerExists) {
        throw new Error('Owner user not found');
      }
    }

    if (ownership.administratorId) {
      const adminExists = await this.assetRepository.userExists(ownership.administratorId);
      if (!adminExists) {
        throw new Error('Administrator user not found');
      }
    }

    const updateData: UpdateAssetData = {
      ownerId: ownership.ownerId,
      administratorId: ownership.administratorId,
    };

    const updatedAsset = await this.assetRepository.update(id, updateData);
    if (!updatedAsset) {
      throw new Error('Failed to update asset ownership');
    }

    return updatedAsset;
  }

  /**
   * Update asset status
   */
  async updateAssetStatus(id: string, isActive: boolean): Promise<Asset> {
    const existingAsset = await this.assetRepository.findById(id);
    if (!existingAsset) {
      throw new Error('Asset not found');
    }

    // Check if asset has active work orders before deactivating
    if (!isActive) {
      const hasActiveWorkOrders = await this.assetRepository.hasActiveWorkOrders(id);
      if (hasActiveWorkOrders) {
        throw new Error('Cannot deactivate asset with active work orders. Please complete them first.');
      }
    }

    const updatedAsset = await this.assetRepository.update(id, { isActive });
    if (!updatedAsset) {
      throw new Error('Failed to update asset status');
    }

    return updatedAsset;
  }

  /**
   * Bulk operations on assets
   */
  async bulkOperation(operation: BulkAssetOperation): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const assetId of operation.assetIds) {
      try {
        switch (operation.operation) {
          case 'activate':
            await this.updateAssetStatus(assetId, true);
            break;
          case 'deactivate':
            await this.updateAssetStatus(assetId, false);
            break;
          case 'delete':
            await this.deleteAsset(assetId);
            break;
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Asset ${assetId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Search assets by query
   */
  async searchAssets(query: string, limit: number = 20): Promise<Asset[]> {
    if (!query || query.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters');
    }

    return this.assetRepository.search(query.trim(), limit);
  }

  /**
   * Get assets by location (for dropdowns)
   */
  async getAssetsByLocation(location: string): Promise<Asset[]> {
    return this.assetRepository.findByLocation(location);
  }

  /**
   * Get available locations
   */
  async getLocations(): Promise<string[]> {
    return this.assetRepository.getDistinctLocations();
  }

  /**
   * Get asset statistics
   */
  async getAssetStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byLocation: Record<string, number>;
  }> {
    // More efficient: Get all statistics in parallel and use actual count queries
    const [
      totalResult,
      activeResult,
      inactiveResult,
      allAssetsForLocation,
    ] = await Promise.all([
      this.assetRepository.findMany({ limit: 1 }), // Only for count
      this.assetRepository.findMany({ isActive: true, limit: 1 }), // Only for count  
      this.assetRepository.findMany({ isActive: false, limit: 1 }), // Only for count
      this.assetRepository.findMany({ limit: 10000 }), // Get all assets for location stats
    ]);

    // Build location distribution map efficiently
    const byLocation: Record<string, number> = {};
    
    allAssetsForLocation.assets.forEach(asset => {
      const location = asset.location;
      byLocation[location] = (byLocation[location] || 0) + 1;
    });

    return {
      total: totalResult.total,
      active: activeResult.total,
      inactive: inactiveResult.total,
      byLocation,
    };
  }
}