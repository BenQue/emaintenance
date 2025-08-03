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
router.get('/stats', generalRateLimit, assetController.getAssetStats);
router.get('/:id', generalRateLimit, assetController.getAssetById);
router.post('/', generalRateLimit, assetController.createAsset);
router.put('/:id', generalRateLimit, assetController.updateAsset);
router.delete('/:id', generalRateLimit, assetController.deleteAsset);

// Bulk operations
router.post('/bulk', generalRateLimit, assetController.bulkCreateAssets);

export default router;