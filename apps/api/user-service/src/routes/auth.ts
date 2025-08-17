import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimiter';

const router = Router();
const authController = new AuthController();

// Authentication routes with rate limiting
router.post('/register', authRateLimit, authController.register);
router.post('/login', authRateLimit, authController.login);

// Protected routes
router.get('/profile', authenticate, authController.profile);
router.get('/validate', authenticate, authController.validateToken);

export default router;