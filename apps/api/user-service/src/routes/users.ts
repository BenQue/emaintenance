import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate, requireSupervisor } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// All user management routes require authentication and supervisor/admin role
router.use(authenticate);
router.use(requireSupervisor);

// User management routes
router.get('/', userController.getUsers);
router.get('/search', userController.searchUsers);
router.get('/role/:role', userController.getUsersByRole);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.patch('/:id/role', userController.updateUserRole);
router.patch('/:id/status', userController.updateUserStatus);
router.delete('/:id', userController.deleteUser);
router.post('/bulk', userController.bulkOperation);

export default router;