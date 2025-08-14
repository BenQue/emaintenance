"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetService = void 0;
const AssetRepository_1 = require("../repositories/AssetRepository");
const qr_generator_1 = require("../utils/qr-generator");
const logger_1 = __importDefault(require("../utils/logger"));
class AssetService {
    prisma;
    assetRepository;
    constructor(prisma) {
        this.prisma = prisma;
        this.assetRepository = new AssetRepository_1.AssetRepository(prisma);
    }
    /**
     * Create a new asset
     */
    async createAsset(data) {
        try {
            // Check if asset code already exists
            const existingAsset = await this.assetRepository.getAssetByCode(data.assetCode);
            if (existingAsset) {
                logger_1.default.warn('Asset creation failed: Asset code already exists', {
                    assetCode: data.assetCode
                });
                throw new Error('Asset code already exists');
            }
            const asset = await this.assetRepository.createAsset(data);
            logger_1.default.info('Asset created via service', {
                assetId: asset.id,
                assetCode: asset.assetCode,
                name: asset.name
            });
            return asset;
        }
        catch (error) {
            logger_1.default.error('Asset service: Failed to create asset', {
                data,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Get asset by ID
     */
    async getAssetById(id) {
        try {
            const asset = await this.assetRepository.getAssetById(id);
            if (!asset) {
                logger_1.default.warn('Asset service: Asset not found', { assetId: id });
                throw new Error('Asset not found');
            }
            return asset;
        }
        catch (error) {
            logger_1.default.error('Asset service: Failed to get asset by ID', {
                assetId: id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Get asset by code
     */
    async getAssetByCode(assetCode) {
        try {
            const asset = await this.assetRepository.getAssetByCode(assetCode);
            if (!asset) {
                logger_1.default.warn('Asset service: Asset not found by code', { assetCode });
                throw new Error('Asset not found');
            }
            return asset;
        }
        catch (error) {
            logger_1.default.error('Asset service: Failed to get asset by code', {
                assetCode,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Update asset
     */
    async updateAsset(id, data) {
        try {
            // Check if asset exists
            await this.getAssetById(id);
            // If updating asset code, check for duplicates
            if (data.assetCode) {
                const existingAsset = await this.assetRepository.getAssetByCode(data.assetCode);
                if (existingAsset && existingAsset.id !== id) {
                    logger_1.default.warn('Asset update failed: Asset code already exists', {
                        assetCode: data.assetCode,
                        existingAssetId: existingAsset.id,
                        updateAssetId: id
                    });
                    throw new Error('Asset code already exists');
                }
            }
            const asset = await this.assetRepository.updateAsset(id, data);
            logger_1.default.info('Asset updated via service', {
                assetId: id,
                updatedFields: Object.keys(data)
            });
            return asset;
        }
        catch (error) {
            logger_1.default.error('Asset service: Failed to update asset', {
                assetId: id,
                data,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Delete asset
     */
    async deleteAsset(id) {
        try {
            // Check if asset exists
            await this.getAssetById(id);
            // Check for active work orders (business rule)
            const activeWorkOrders = await this.prisma.workOrder.count({
                where: {
                    assetId: id,
                    status: {
                        in: ['PENDING', 'IN_PROGRESS', 'WAITING_PARTS']
                    }
                }
            });
            if (activeWorkOrders > 0) {
                logger_1.default.warn('Asset deletion failed: Active work orders exist', {
                    assetId: id,
                    activeWorkOrders
                });
                throw new Error('Cannot delete asset with active work orders');
            }
            await this.assetRepository.deleteAsset(id);
            logger_1.default.info('Asset deleted via service', { assetId: id });
        }
        catch (error) {
            logger_1.default.error('Asset service: Failed to delete asset', {
                assetId: id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * List assets with filtering and pagination
     */
    async listAssets(filters = {}) {
        try {
            const result = await this.assetRepository.listAssets(filters);
            logger_1.default.debug('Assets listed via service', {
                total: result.total,
                page: result.page,
                limit: result.limit,
                filters
            });
            return result;
        }
        catch (error) {
            logger_1.default.error('Asset service: Failed to list assets', {
                filters,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Search assets
     */
    async searchAssets(query, filters = {}) {
        try {
            if (!query || query.trim().length === 0) {
                throw new Error('Search query is required');
            }
            const assets = await this.assetRepository.searchAssets(query.trim(), filters);
            logger_1.default.debug('Asset search completed via service', {
                query,
                filters,
                resultCount: assets.length
            });
            return assets;
        }
        catch (error) {
            logger_1.default.error('Asset service: Failed to search assets', {
                query,
                filters,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Search assets by partial code for autocomplete
     */
    async searchAssetsByCode(partialCode, filters = {}) {
        try {
            if (!partialCode || partialCode.trim().length === 0) {
                return [];
            }
            const assets = await this.assetRepository.searchAssetsByCode(partialCode.trim(), filters);
            logger_1.default.debug('Asset code search completed via service', {
                partialCode: partialCode.trim(),
                filters,
                resultCount: assets.length
            });
            return assets;
        }
        catch (error) {
            logger_1.default.error('Asset service: Failed to search assets by code', {
                partialCode,
                filters,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Validate asset code
     */
    async validateAssetCode(assetCode) {
        try {
            if (!assetCode || assetCode.trim().length === 0) {
                throw new Error('Asset code is required');
            }
            const result = await this.assetRepository.validateAssetCode(assetCode.trim());
            logger_1.default.debug('Asset code validation completed via service', {
                assetCode: assetCode.trim(),
                exists: result.exists
            });
            return result;
        }
        catch (error) {
            logger_1.default.error('Asset service: Failed to validate asset code', {
                assetCode,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Get asset suggestions with fuzzy matching
     */
    async getAssetSuggestions(input, filters = {}) {
        try {
            if (!input || input.trim().length === 0) {
                return [];
            }
            const suggestions = await this.assetRepository.getAssetSuggestions(input.trim(), filters);
            logger_1.default.debug('Asset suggestions completed via service', {
                input: input.trim(),
                filters,
                resultCount: suggestions.length
            });
            return suggestions;
        }
        catch (error) {
            logger_1.default.error('Asset service: Failed to get asset suggestions', {
                input,
                filters,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Generate QR code for asset
     */
    async generateAssetQRCode(id) {
        try {
            const asset = await this.getAssetById(id);
            const qrCodeDataURL = await (0, qr_generator_1.generateAssetQRCode)(asset.assetCode);
            logger_1.default.info('QR code generated for asset via service', {
                assetId: id,
                assetCode: asset.assetCode
            });
            return qrCodeDataURL;
        }
        catch (error) {
            logger_1.default.error('Asset service: Failed to generate QR code', {
                assetId: id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Get asset maintenance history
     */
    async getAssetMaintenanceHistory(id) {
        try {
            // Check if asset exists
            await this.getAssetById(id);
            const history = await this.assetRepository.getAssetMaintenanceHistory(id);
            logger_1.default.debug('Asset maintenance history retrieved via service', {
                assetId: id,
                recordCount: history.length
            });
            return history;
        }
        catch (error) {
            logger_1.default.error('Asset service: Failed to get maintenance history', {
                assetId: id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async getDowntimeStatistics(filters = {}) {
        return await this.assetRepository.getAssetDowntimeStatistics(filters);
    }
    async getDowntimeRanking(filters = {}) {
        const statistics = await this.assetRepository.getAssetDowntimeStatistics(filters);
        const limit = filters.limit || 5;
        return statistics
            .sort((a, b) => b.totalDowntimeHours - a.totalDowntimeHours)
            .slice(0, limit);
    }
    async getFaultFrequencyRanking(filters = {}) {
        const performance = await this.assetRepository.getAssetPerformanceRanking(filters);
        const limit = filters.limit || 5;
        return performance
            .sort((a, b) => b.faultFrequency - a.faultFrequency)
            .slice(0, limit);
    }
    async getMaintenanceCostAnalysis(filters = {}) {
        const performance = await this.assetRepository.getAssetPerformanceRanking(filters);
        const limit = filters.limit || 10;
        return performance
            .sort((a, b) => b.maintenanceCost - a.maintenanceCost)
            .slice(0, limit);
    }
    async getHealthOverview(filters = {}) {
        return await this.assetRepository.getAssetHealthMetrics(filters);
    }
    async getPerformanceRanking(filters = {}) {
        return await this.assetRepository.getAssetPerformanceRanking(filters);
    }
    async getCriticalAssets(filters = {}) {
        const performance = await this.assetRepository.getAssetPerformanceRanking(filters);
        return performance
            .filter(asset => asset.healthScore < 50)
            .sort((a, b) => a.healthScore - b.healthScore)
            .slice(0, filters.limit || 5);
    }
    /**
     * Get unique asset locations
     */
    async getUniqueLocations() {
        try {
            const locations = await this.prisma.asset.findMany({
                select: { location: true },
                distinct: ['location'],
                orderBy: { location: 'asc' }
            });
            const uniqueLocations = locations.map(item => item.location);
            logger_1.default.debug('Unique locations retrieved via service', {
                count: uniqueLocations.length
            });
            return uniqueLocations;
        }
        catch (error) {
            logger_1.default.error('Asset service: Failed to get unique locations', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Get general asset statistics for dashboard
     */
    async getAssetStatistics() {
        try {
            const [totalCount, activeCount, inactiveCount, locationStats, manufacturerStats] = await Promise.all([
                this.prisma.asset.count(),
                this.prisma.asset.count({ where: { isActive: true } }),
                this.prisma.asset.count({ where: { isActive: false } }),
                this.prisma.asset.groupBy({
                    by: ['location'],
                    _count: { location: true }
                }),
                this.prisma.asset.groupBy({
                    by: ['manufacturer'],
                    _count: { manufacturer: true },
                    where: { manufacturer: { not: null } }
                })
            ]);
            const byLocation = {};
            locationStats.forEach(stat => {
                byLocation[stat.location] = stat._count.location;
            });
            const byManufacturer = {};
            manufacturerStats.forEach(stat => {
                if (stat.manufacturer) {
                    byManufacturer[stat.manufacturer] = stat._count.manufacturer;
                }
            });
            const uniqueLocations = locationStats.length;
            logger_1.default.debug('Asset statistics retrieved via service', {
                total: totalCount,
                active: activeCount,
                inactive: inactiveCount,
                locations: uniqueLocations
            });
            return {
                total: totalCount,
                active: activeCount,
                inactive: inactiveCount,
                locations: uniqueLocations,
                byLocation,
                byManufacturer
            };
        }
        catch (error) {
            logger_1.default.error('Asset service: Failed to get asset statistics', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
}
exports.AssetService = AssetService;
