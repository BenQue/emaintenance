"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetController = void 0;
const AssetService_1 = require("../services/AssetService");
const logger_1 = __importDefault(require("../utils/logger"));
class AssetController {
    prisma;
    assetService;
    constructor(prisma) {
        this.prisma = prisma;
        this.assetService = new AssetService_1.AssetService(prisma);
    }
    async getDowntimeRanking(req, res) {
        try {
            const filters = this.parseKPIFilters(req.query);
            const ranking = await this.assetService.getDowntimeRanking(filters);
            res.json({
                success: true,
                data: ranking,
            });
        }
        catch (error) {
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.error('Error fetching asset downtime ranking', {
                correlationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch asset downtime ranking',
                timestamp: new Date().toISOString(),
            });
        }
    }
    async getFaultFrequencyRanking(req, res) {
        try {
            const filters = this.parseKPIFilters(req.query);
            const ranking = await this.assetService.getFaultFrequencyRanking(filters);
            res.json({
                success: true,
                data: ranking,
            });
        }
        catch (error) {
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.error('Error fetching fault frequency ranking', {
                correlationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch fault frequency ranking',
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * Create a new asset
     */
    async createAsset(req, res) {
        try {
            const data = req.body;
            const asset = await this.assetService.createAsset(data);
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.info('Asset created successfully', {
                correlationId,
                assetId: asset.id,
                assetCode: asset.assetCode
            });
            res.status(201).json({
                success: true,
                data: asset,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.error('Error creating asset', {
                correlationId,
                body: req.body,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            const statusCode = error instanceof Error && error.message.includes('already exists') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create asset',
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * Get asset by ID
     */
    async getAssetById(req, res) {
        try {
            const { id } = req.params;
            const asset = await this.assetService.getAssetById(id);
            res.json({
                success: true,
                data: asset,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.error('Error fetching asset by ID', {
                correlationId,
                assetId: req.params.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            const statusCode = error instanceof Error && error.message === 'Asset not found' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch asset',
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * Update asset
     */
    async updateAsset(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            const asset = await this.assetService.updateAsset(id, data);
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.info('Asset updated successfully', {
                correlationId,
                assetId: id,
                updatedFields: Object.keys(data)
            });
            res.json({
                success: true,
                data: asset,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.error('Error updating asset', {
                correlationId,
                assetId: req.params.id,
                body: req.body,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            let statusCode = 500;
            if (error instanceof Error) {
                if (error.message === 'Asset not found')
                    statusCode = 404;
                else if (error.message.includes('already exists'))
                    statusCode = 409;
            }
            res.status(statusCode).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update asset',
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * Delete asset
     */
    async deleteAsset(req, res) {
        try {
            const { id } = req.params;
            await this.assetService.deleteAsset(id);
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.info('Asset deleted successfully', {
                correlationId,
                assetId: id
            });
            res.json({
                success: true,
                message: 'Asset deleted successfully',
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.error('Error deleting asset', {
                correlationId,
                assetId: req.params.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            let statusCode = 500;
            if (error instanceof Error) {
                if (error.message === 'Asset not found')
                    statusCode = 404;
                else if (error.message.includes('active work orders'))
                    statusCode = 409;
            }
            res.status(statusCode).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete asset',
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * List assets with pagination and filtering
     */
    async listAssets(req, res) {
        try {
            const filters = this.parseListFilters(req.query);
            const result = await this.assetService.listAssets(filters);
            res.json({
                success: true,
                data: result.assets,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages,
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.error('Error listing assets', {
                correlationId,
                query: req.query,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                success: false,
                error: 'Failed to list assets',
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * Search assets
     */
    async searchAssets(req, res) {
        try {
            const { q, category, location, status, limit } = req.query;
            if (!q || typeof q !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'Search query parameter "q" is required',
                    timestamp: new Date().toISOString(),
                });
            }
            const filters = {
                category: category,
                location: location,
                status: status,
                limit: limit ? parseInt(limit, 10) : undefined,
            };
            const assets = await this.assetService.searchAssets(q, filters);
            res.json({
                success: true,
                data: assets,
                query: q,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.error('Error searching assets', {
                correlationId,
                query: req.query,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to search assets',
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * Generate QR code for asset
     */
    async generateQRCode(req, res) {
        try {
            const { id } = req.params;
            const qrCodeDataURL = await this.assetService.generateAssetQRCode(id);
            res.json({
                success: true,
                data: { qrCode: qrCodeDataURL },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.error('Error generating QR code', {
                correlationId,
                assetId: req.params.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            const statusCode = error instanceof Error && error.message === 'Asset not found' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate QR code',
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * Get asset maintenance history
     */
    async getMaintenanceHistory(req, res) {
        try {
            const { id } = req.params;
            const history = await this.assetService.getAssetMaintenanceHistory(id);
            res.json({
                success: true,
                data: history,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.error('Error fetching maintenance history', {
                correlationId,
                assetId: req.params.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            const statusCode = error instanceof Error && error.message === 'Asset not found' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch maintenance history',
                timestamp: new Date().toISOString(),
            });
        }
    }
    async getMaintenanceCostAnalysis(req, res) {
        try {
            const filters = this.parseKPIFilters(req.query);
            const analysis = await this.assetService.getMaintenanceCostAnalysis(filters);
            res.json({
                success: true,
                data: analysis,
            });
        }
        catch (error) {
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.error('Error fetching maintenance cost analysis', {
                correlationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch maintenance cost analysis',
                timestamp: new Date().toISOString(),
            });
        }
    }
    async getHealthOverview(req, res) {
        try {
            const filters = this.parseKPIFilters(req.query);
            const overview = await this.assetService.getHealthOverview(filters);
            res.json({
                success: true,
                data: overview,
            });
        }
        catch (error) {
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.error('Error fetching asset health overview', {
                correlationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch asset health overview',
                timestamp: new Date().toISOString(),
            });
        }
    }
    async getPerformanceRanking(req, res) {
        try {
            const filters = this.parseKPIFilters(req.query);
            const ranking = await this.assetService.getPerformanceRanking(filters);
            res.json({
                success: true,
                data: ranking,
            });
        }
        catch (error) {
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.error('Error fetching asset performance ranking', {
                correlationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch asset performance ranking',
                timestamp: new Date().toISOString(),
            });
        }
    }
    async getCriticalAssets(req, res) {
        try {
            const filters = this.parseKPIFilters(req.query);
            const criticalAssets = await this.assetService.getCriticalAssets(filters);
            res.json({
                success: true,
                data: criticalAssets,
            });
        }
        catch (error) {
            const correlationId = req.headers['x-correlation-id'];
            logger_1.default.error('Error fetching critical assets', {
                correlationId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            res.status(500).json({
                success: false,
                error: 'Failed to fetch critical assets',
                timestamp: new Date().toISOString(),
            });
        }
    }
    parseKPIFilters(query) {
        const filters = {};
        if (query.location) {
            filters.location = query.location;
        }
        if (query.assetType) {
            filters.assetType = query.assetType;
        }
        if (query.startDate) {
            filters.startDate = new Date(query.startDate);
        }
        if (query.endDate) {
            filters.endDate = new Date(query.endDate);
        }
        if (query.timeRange && ['week', 'month', 'quarter', 'year'].includes(query.timeRange)) {
            filters.timeRange = query.timeRange;
        }
        if (query.limit) {
            const limit = parseInt(query.limit, 10);
            if (!isNaN(limit) && limit > 0 && limit <= 100) {
                filters.limit = limit;
            }
        }
        return filters;
    }
    parseListFilters(query) {
        const filters = {};
        if (query.page) {
            const page = parseInt(query.page, 10);
            if (!isNaN(page) && page > 0) {
                filters.page = page;
            }
        }
        if (query.limit) {
            const limit = parseInt(query.limit, 10);
            if (!isNaN(limit) && limit > 0 && limit <= 100) {
                filters.limit = limit;
            }
        }
        if (query.search && typeof query.search === 'string') {
            filters.search = query.search.trim();
        }
        if (query.category && typeof query.category === 'string') {
            filters.category = query.category;
        }
        if (query.location && typeof query.location === 'string') {
            filters.location = query.location;
        }
        if (query.status && ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'].includes(query.status)) {
            filters.status = query.status;
        }
        if (query.sortBy && ['name', 'assetCode', 'createdAt', 'updatedAt'].includes(query.sortBy)) {
            filters.sortBy = query.sortBy;
        }
        if (query.sortOrder && ['asc', 'desc'].includes(query.sortOrder)) {
            filters.sortOrder = query.sortOrder;
        }
        return filters;
    }
}
exports.AssetController = AssetController;
