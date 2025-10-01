import { Router } from 'express';
import { SettingsController } from '../controllers/SettingsController';
import { authenticate, requireSupervisor } from '../middleware/auth';

const router = Router();
const settingsController = new SettingsController();

// Apply authentication to all settings routes
router.use(authenticate);

// Read-only routes (all authenticated users can read)
router.get('/categories', settingsController.getCategories);
router.get('/locations', settingsController.getLocations);
router.get('/fault-codes', settingsController.getFaultCodes);
router.get('/reasons', settingsController.getReasons);
router.get('/fault-symptoms', settingsController.getFaultSymptoms);
router.get('/priority-levels', settingsController.getPriorityLevels);
router.get('/categories-with-reasons', settingsController.getCategoriesWithReasons);
router.get('/categories/:categoryId/reasons', settingsController.getReasonsByCategory);

// Apply supervisor role requirement for all write operations below
router.use(requireSupervisor);

// Categories write routes
router.post('/categories', settingsController.createCategory);
router.put('/categories/:id', settingsController.updateCategory);
router.delete('/categories/:id', settingsController.deleteCategory);
router.get('/categories/:id/usage', settingsController.getCategoryUsage);

// Locations write routes
router.post('/locations', settingsController.createLocation);
router.put('/locations/:id', settingsController.updateLocation);
router.delete('/locations/:id', settingsController.deleteLocation);
router.get('/locations/:id/usage', settingsController.getLocationUsage);

// Fault codes write routes
router.post('/fault-codes', settingsController.createFaultCode);
router.put('/fault-codes/:id', settingsController.updateFaultCode);
router.delete('/fault-codes/:id', settingsController.deleteFaultCode);
router.get('/fault-codes/:id/usage', settingsController.getFaultCodeUsage);

// Reasons write routes
router.post('/reasons', settingsController.createReason);
router.put('/reasons/:id', settingsController.updateReason);
router.delete('/reasons/:id', settingsController.deleteReason);
router.get('/reasons/:id/usage', settingsController.getReasonUsage);

// Fault symptoms write routes
router.post('/fault-symptoms', settingsController.createFaultSymptom);
router.put('/fault-symptoms/:id', settingsController.updateFaultSymptom);
router.delete('/fault-symptoms/:id', settingsController.deleteFaultSymptom);
router.get('/fault-symptoms/:id/usage', settingsController.getFaultSymptomUsage);

// Priority levels write routes
router.post('/priority-levels', settingsController.createPriorityLevel);
router.put('/priority-levels/:id', settingsController.updatePriorityLevel);
router.delete('/priority-levels/:id', settingsController.deletePriorityLevel);
router.get('/priority-levels/:id/usage', settingsController.getPriorityLevelUsage);

// Integrated Categories with Reasons write routes
router.post('/categories/:categoryId/reasons', settingsController.createReasonForCategory);

export default router;