"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AssetController_1 = require("../controllers/AssetController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
const assetController = new AssetController_1.AssetController();
// QR scanning route - only requires authentication (for mobile app)
// This allows all authenticated users (including EMPLOYEE) to scan QR codes
router.get('/code/:code', auth_1.authenticate, rateLimiter_1.generalRateLimit, assetController.getAssetByCode);
// Special routes that need specific handling (before catch-all /:id route)
router.get('/search', auth_1.authenticate, auth_1.requireSupervisor, rateLimiter_1.generalRateLimit, assetController.searchAssets);
router.get('/stats', auth_1.authenticate, auth_1.requireSupervisor, rateLimiter_1.generalRateLimit, assetController.getAssetStats);
router.get('/locations', auth_1.authenticate, auth_1.requireSupervisor, rateLimiter_1.generalRateLimit, assetController.getLocations);
router.get('/location/:location', auth_1.authenticate, auth_1.requireSupervisor, rateLimiter_1.generalRateLimit, assetController.getAssetsByLocation);
// Asset CRUD routes with SUPERVISOR/ADMIN role requirement
router.get('/', auth_1.authenticate, auth_1.requireSupervisor, rateLimiter_1.generalRateLimit, assetController.listAssets);
router.get('/:id', auth_1.authenticate, auth_1.requireSupervisor, rateLimiter_1.generalRateLimit, assetController.getAssetById);
router.post('/', rateLimiter_1.generalRateLimit, assetController.createAsset);
router.put('/:id', rateLimiter_1.generalRateLimit, assetController.updateAsset);
router.patch('/:id/ownership', rateLimiter_1.generalRateLimit, assetController.updateAssetOwnership);
router.patch('/:id/status', rateLimiter_1.generalRateLimit, assetController.updateAssetStatus);
router.delete('/:id', rateLimiter_1.generalRateLimit, assetController.deleteAsset);
// Bulk operations
router.post('/bulk', rateLimiter_1.generalRateLimit, assetController.bulkCreateAssets);
router.post('/bulk/operation', rateLimiter_1.generalRateLimit, assetController.bulkOperation);
exports.default = router;
