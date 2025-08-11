"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AssetController_1 = require("../controllers/AssetController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
const assetController = new AssetController_1.AssetController();
// QR scanning route - only requires authentication (for mobile app)
router.get('/code/:code', auth_1.authenticate, rateLimiter_1.generalRateLimit, assetController.getAssetByCode);
// All other asset routes require authentication and SUPERVISOR/ADMIN role
router.use(auth_1.authenticate);
router.use(auth_1.requireSupervisor);
// Asset CRUD routes
router.get('/', rateLimiter_1.generalRateLimit, assetController.listAssets);
router.get('/search', rateLimiter_1.generalRateLimit, assetController.searchAssets);
router.get('/stats', rateLimiter_1.generalRateLimit, assetController.getAssetStats);
router.get('/locations', rateLimiter_1.generalRateLimit, assetController.getLocations);
router.get('/location/:location', rateLimiter_1.generalRateLimit, assetController.getAssetsByLocation);
router.get('/:id', rateLimiter_1.generalRateLimit, assetController.getAssetById);
router.post('/', rateLimiter_1.generalRateLimit, assetController.createAsset);
router.put('/:id', rateLimiter_1.generalRateLimit, assetController.updateAsset);
router.patch('/:id/ownership', rateLimiter_1.generalRateLimit, assetController.updateAssetOwnership);
router.patch('/:id/status', rateLimiter_1.generalRateLimit, assetController.updateAssetStatus);
router.delete('/:id', rateLimiter_1.generalRateLimit, assetController.deleteAsset);
// Bulk operations
router.post('/bulk', rateLimiter_1.generalRateLimit, assetController.bulkCreateAssets);
router.post('/bulk/operation', rateLimiter_1.generalRateLimit, assetController.bulkOperation);
exports.default = router;
