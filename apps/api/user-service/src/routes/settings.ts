import { Router } from 'express';
import { SettingsController } from '../controllers/SettingsController';
import { authenticate, requireSupervisor } from '../middleware/auth';

const router = Router();
const settingsController = new SettingsController();

// Apply authentication to all settings routes
router.use(authenticate);

// Apply role-based authorization - only SUPERVISOR and ADMIN can manage settings
router.use(requireSupervisor);

// Categories routes
router.get('/categories', settingsController.getCategories);
router.post('/categories', settingsController.createCategory);
router.put('/categories/:id', settingsController.updateCategory);
router.delete('/categories/:id', settingsController.deleteCategory);
router.get('/categories/:id/usage', settingsController.getCategoryUsage);

// Locations routes
router.get('/locations', settingsController.getLocations);
router.post('/locations', settingsController.createLocation);
router.put('/locations/:id', settingsController.updateLocation);
router.delete('/locations/:id', settingsController.deleteLocation);
router.get('/locations/:id/usage', settingsController.getLocationUsage);

// Fault codes routes
router.get('/fault-codes', settingsController.getFaultCodes);
router.post('/fault-codes', settingsController.createFaultCode);
router.put('/fault-codes/:id', settingsController.updateFaultCode);
router.delete('/fault-codes/:id', settingsController.deleteFaultCode);
router.get('/fault-codes/:id/usage', settingsController.getFaultCodeUsage);

// Reasons routes
router.get('/reasons', settingsController.getReasons);
router.post('/reasons', settingsController.createReason);
router.put('/reasons/:id', settingsController.updateReason);
router.delete('/reasons/:id', settingsController.deleteReason);
router.get('/reasons/:id/usage', settingsController.getReasonUsage);

// Priority levels routes
router.get('/priority-levels', settingsController.getPriorityLevels);
router.post('/priority-levels', settingsController.createPriorityLevel);
router.put('/priority-levels/:id', settingsController.updatePriorityLevel);
router.delete('/priority-levels/:id', settingsController.deletePriorityLevel);
router.get('/priority-levels/:id/usage', settingsController.getPriorityLevelUsage);

// Integrated Categories with Reasons routes
router.get('/categories-with-reasons', settingsController.getCategoriesWithReasons);
router.get('/categories/:categoryId/reasons', settingsController.getReasonsByCategory);
router.post('/categories/:categoryId/reasons', settingsController.createReasonForCategory);

export default router;