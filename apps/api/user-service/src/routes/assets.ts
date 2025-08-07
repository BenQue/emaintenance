import { Router } from 'express';
import { AssetController } from '../controllers/AssetController';
import { authenticate, requireSupervisor } from '../middleware/auth';
import { generalRateLimit } from '../middleware/rateLimiter';

const router = Router();
const assetController = new AssetController();

// QR scanning route - only requires authentication (for mobile app)
// This allows all authenticated users (including EMPLOYEE) to scan QR codes
router.get('/code/:code', authenticate, generalRateLimit, assetController.getAssetByCode);

// Special routes that need specific handling (before catch-all /:id route)
router.get('/search', authenticate, requireSupervisor, generalRateLimit, assetController.searchAssets);
router.get('/stats', authenticate, requireSupervisor, generalRateLimit, assetController.getAssetStats);
router.get('/locations', authenticate, requireSupervisor, generalRateLimit, assetController.getLocations);
router.get('/location/:location', authenticate, requireSupervisor, generalRateLimit, assetController.getAssetsByLocation);

// Asset CRUD routes with SUPERVISOR/ADMIN role requirement
router.get('/', authenticate, requireSupervisor, generalRateLimit, assetController.listAssets);
router.get('/:id', authenticate, requireSupervisor, generalRateLimit, assetController.getAssetById);
router.post('/', generalRateLimit, assetController.createAsset);
router.put('/:id', generalRateLimit, assetController.updateAsset);
router.patch('/:id/ownership', generalRateLimit, assetController.updateAssetOwnership);
router.patch('/:id/status', generalRateLimit, assetController.updateAssetStatus);
router.delete('/:id', generalRateLimit, assetController.deleteAsset);

// Bulk operations
router.post('/bulk', generalRateLimit, assetController.bulkCreateAssets);
router.post('/bulk/operation', generalRateLimit, assetController.bulkOperation);

export default router;