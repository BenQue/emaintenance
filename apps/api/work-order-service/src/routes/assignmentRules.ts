import express from 'express';
import { PrismaClient } from '@emaintenance/database';
import { UserRole } from '@emaintenance/database';
import { AssignmentRuleController } from '../controllers/AssignmentRuleController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Create routes with PrismaClient dependency injection
export const createAssignmentRuleRoutes = (prisma: PrismaClient) => {
  const assignmentRuleController = new AssignmentRuleController(prisma);
  
  // All routes require authentication
  router.use(authenticate(prisma));

  // Assignment rule CRUD routes - require supervisor or admin role
  router.post('/', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    assignmentRuleController.createRule
  );

  router.get('/', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    assignmentRuleController.getRules
  );

  router.get('/:id', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    assignmentRuleController.getRuleById
  );

  router.put('/:id', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    assignmentRuleController.updateRule
  );

  router.delete('/:id', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    assignmentRuleController.deleteRule
  );

  return router;
};

export default router;