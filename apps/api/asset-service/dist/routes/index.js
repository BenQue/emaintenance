"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const AssetController_1 = require("../controllers/AssetController");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const logging_middleware_1 = require("../middleware/logging.middleware");
const database_1 = require("@emaintenance/database");
const router = (0, express_1.Router)();
const prisma = new database_1.PrismaClient();
const assetController = new AssetController_1.AssetController(prisma);
// Rate limiting configuration
const generalRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit for development
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString(),
    },
});
const strictRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 200 : 20, // Higher limit for development
    message: {
        success: false,
        error: 'Too many modification requests from this IP, please try again later.',
        timestamp: new Date().toISOString(),
    },
});
// Apply global middleware
router.use(logging_middleware_1.requestLogger);
router.use(generalRateLimit);
// Health check (no auth required)
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'asset-service',
        timestamp: new Date().toISOString()
    });
});
// Asset CRUD Operations
router.post('/assets', strictRateLimit, auth_middleware_1.authenticate, auth_middleware_1.requireSupervisor, // Only SUPERVISOR and ADMIN can create assets
validation_middleware_1.validateCreateAsset, assetController.createAsset.bind(assetController));
router.get('/assets', auth_middleware_1.authenticate, // All authenticated users can list assets
validation_middleware_1.validateListAssets, assetController.listAssets.bind(assetController));
// Asset utility endpoints (place before parameterized routes)
router.get('/assets/search', auth_middleware_1.authenticate, // All authenticated users can search assets
validation_middleware_1.validateSearchAssets, assetController.searchAssets.bind(assetController));
// Manual asset code input endpoints
router.get('/assets/search-by-code', auth_middleware_1.authenticate, // All authenticated users can search by asset code
assetController.searchAssetsByCode.bind(assetController));
router.get('/assets/validate', auth_middleware_1.authenticate, // All authenticated users can validate asset codes
assetController.validateAssetCode.bind(assetController));
router.get('/assets/suggest', auth_middleware_1.authenticate, // All authenticated users can get asset suggestions
assetController.getAssetSuggestions.bind(assetController));
router.get('/assets/stats', auth_middleware_1.authenticate, auth_middleware_1.requireSupervisor, // Stats are for supervisors and above
assetController.getAssetStats.bind(assetController));
router.get('/assets/locations', auth_middleware_1.authenticate, // All authenticated users can get locations for filtering
assetController.getLocations.bind(assetController));
// Parameterized routes (place after utility endpoints)
router.get('/assets/:id', auth_middleware_1.authenticate, validation_middleware_1.validateGetAssetById, assetController.getAssetById.bind(assetController));
router.put('/assets/:id', strictRateLimit, auth_middleware_1.authenticate, auth_middleware_1.requireSupervisor, // Only SUPERVISOR and ADMIN can update assets
validation_middleware_1.validateUpdateAsset, assetController.updateAsset.bind(assetController));
router.delete('/assets/:id', strictRateLimit, auth_middleware_1.authenticate, auth_middleware_1.requireAdmin, // Only ADMIN can delete assets
validation_middleware_1.validateGetAssetById, // Reuse validation for ID format
assetController.deleteAsset.bind(assetController));
// Asset-specific operations
router.get('/assets/:id/qr-code', auth_middleware_1.authenticate, validation_middleware_1.validateGetAssetById, assetController.generateQRCode.bind(assetController));
router.get('/assets/:id/history', auth_middleware_1.authenticate, auth_middleware_1.requireTechnician, // Technicians and above can view maintenance history
validation_middleware_1.validateGetAssetById, assetController.getMaintenanceHistory.bind(assetController));
// Asset KPI Routes (existing routes maintained for backward compatibility)
router.get('/assets/kpi/downtime-ranking', auth_middleware_1.authenticate, auth_middleware_1.requireSupervisor, // KPI data is for supervisors and above
assetController.getDowntimeRanking.bind(assetController));
router.get('/assets/kpi/fault-frequency', auth_middleware_1.authenticate, auth_middleware_1.requireSupervisor, assetController.getFaultFrequencyRanking.bind(assetController));
router.get('/assets/kpi/maintenance-cost', auth_middleware_1.authenticate, auth_middleware_1.requireSupervisor, assetController.getMaintenanceCostAnalysis.bind(assetController));
router.get('/assets/kpi/health-overview', auth_middleware_1.authenticate, auth_middleware_1.requireSupervisor, assetController.getHealthOverview.bind(assetController));
router.get('/assets/kpi/performance-ranking', auth_middleware_1.authenticate, auth_middleware_1.requireSupervisor, assetController.getPerformanceRanking.bind(assetController));
router.get('/assets/kpi/critical-assets', auth_middleware_1.authenticate, auth_middleware_1.requireSupervisor, assetController.getCriticalAssets.bind(assetController));
// Error handling middleware (must be last)
router.use(logging_middleware_1.errorLogger);
exports.default = router;
