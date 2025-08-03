import { Router } from 'express';
import { AssetController } from '../controllers/AssetController';
import { authenticate, requireSupervisor } from '../middleware/auth';
import { generalRateLimit } from '../middleware/rateLimiter';

const router = Router();
const assetController = new AssetController();

// All asset routes require authentication and SUPERVISOR/ADMIN role
router.use(authenticate);
router.use(requireSupervisor);

// Asset CRUD routes
router.get('/', generalRateLimit, assetController.listAssets);
router.get('/search', generalRateLimit, assetController.searchAssets);
router.get('/stats', generalRateLimit, assetController.getAssetStats);
router.get('/locations', generalRateLimit, assetController.getLocations);
router.get('/location/:location', generalRateLimit, assetController.getAssetsByLocation);
router.get('/:id', generalRateLimit, assetController.getAssetById);
router.post('/', generalRateLimit, assetController.createAsset);
router.put('/:id', generalRateLimit, assetController.updateAsset);
router.patch('/:id/ownership', generalRateLimit, assetController.updateAssetOwnership);
router.patch('/:id/status', generalRateLimit, assetController.updateAssetStatus);
router.delete('/:id', generalRateLimit, assetController.deleteAsset);

// Bulk operations
router.post('/bulk', generalRateLimit, assetController.bulkCreateAssets);
router.post('/bulk/operation', generalRateLimit, assetController.bulkOperation);

export default router;