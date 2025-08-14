import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AssetController } from '../controllers/AssetController';
import { authenticate, requireAdmin, requireSupervisor, requireTechnician } from '../middleware/auth.middleware';
import { 
  validateCreateAsset, 
  validateUpdateAsset, 
  validateGetAssetById, 
  validateListAssets, 
  validateSearchAssets 
} from '../middleware/validation.middleware';
import { requestLogger, errorLogger } from '../middleware/logging.middleware';
import { PrismaClient } from '@emaintenance/database';

const router = Router();
const prisma = new PrismaClient();
const assetController = new AssetController(prisma);

// Rate limiting configuration
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit for development
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    timestamp: new Date().toISOString(),
  },
});

const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 200 : 20, // Higher limit for development
  message: {
    success: false,
    error: 'Too many modification requests from this IP, please try again later.',
    timestamp: new Date().toISOString(),
  },
});

// Apply global middleware
router.use(requestLogger);
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
router.post(
  '/assets',
  strictRateLimit,
  authenticate,
  requireSupervisor, // Only SUPERVISOR and ADMIN can create assets
  validateCreateAsset,
  assetController.createAsset.bind(assetController)
);

router.get(
  '/assets',
  authenticate, // All authenticated users can list assets
  validateListAssets,
  assetController.listAssets.bind(assetController)
);

// Asset utility endpoints (place before parameterized routes)
router.get(
  '/assets/search',
  authenticate, // All authenticated users can search assets
  validateSearchAssets,
  assetController.searchAssets.bind(assetController)
);

// Manual asset code input endpoints
router.get(
  '/assets/search-by-code',
  authenticate, // All authenticated users can search by asset code
  assetController.searchAssetsByCode.bind(assetController)
);

router.get(
  '/assets/validate',
  authenticate, // All authenticated users can validate asset codes
  assetController.validateAssetCode.bind(assetController)
);

router.get(
  '/assets/suggest',
  authenticate, // All authenticated users can get asset suggestions
  assetController.getAssetSuggestions.bind(assetController)
);

router.get(
  '/assets/stats',
  authenticate,
  requireSupervisor, // Stats are for supervisors and above
  assetController.getAssetStats.bind(assetController)
);

router.get(
  '/assets/locations',
  authenticate, // All authenticated users can get locations for filtering
  assetController.getLocations.bind(assetController)
);

// Parameterized routes (place after utility endpoints)
router.get(
  '/assets/:id',
  authenticate,
  validateGetAssetById,
  assetController.getAssetById.bind(assetController)
);

router.put(
  '/assets/:id',
  strictRateLimit,
  authenticate,
  requireSupervisor, // Only SUPERVISOR and ADMIN can update assets
  validateUpdateAsset,
  assetController.updateAsset.bind(assetController)
);

router.delete(
  '/assets/:id',
  strictRateLimit,
  authenticate,
  requireAdmin, // Only ADMIN can delete assets
  validateGetAssetById, // Reuse validation for ID format
  assetController.deleteAsset.bind(assetController)
);

// Asset-specific operations
router.get(
  '/assets/:id/qr-code',
  authenticate,
  validateGetAssetById,
  assetController.generateQRCode.bind(assetController)
);

router.get(
  '/assets/:id/history',
  authenticate,
  requireTechnician, // Technicians and above can view maintenance history
  validateGetAssetById,
  assetController.getMaintenanceHistory.bind(assetController)
);

// Asset KPI Routes (existing routes maintained for backward compatibility)
router.get(
  '/assets/kpi/downtime-ranking',
  authenticate,
  requireSupervisor, // KPI data is for supervisors and above
  assetController.getDowntimeRanking.bind(assetController)
);

router.get(
  '/assets/kpi/fault-frequency',
  authenticate,
  requireSupervisor,
  assetController.getFaultFrequencyRanking.bind(assetController)
);

router.get(
  '/assets/kpi/maintenance-cost',
  authenticate,
  requireSupervisor,
  assetController.getMaintenanceCostAnalysis.bind(assetController)
);

router.get(
  '/assets/kpi/health-overview',
  authenticate,
  requireSupervisor,
  assetController.getHealthOverview.bind(assetController)
);

router.get(
  '/assets/kpi/performance-ranking',
  authenticate,
  requireSupervisor,
  assetController.getPerformanceRanking.bind(assetController)
);

router.get(
  '/assets/kpi/critical-assets',
  authenticate,
  requireSupervisor,
  assetController.getCriticalAssets.bind(assetController)
);

// Error handling middleware (must be last)
router.use(errorLogger);

export default router;