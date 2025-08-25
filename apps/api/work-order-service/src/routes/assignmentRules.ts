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
    assignmentRuleController.createRule.bind(assignmentRuleController)
  );

  router.get('/', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    assignmentRuleController.getRules.bind(assignmentRuleController)
  );

  router.get('/:id', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    assignmentRuleController.getRuleById.bind(assignmentRuleController)
  );

  router.put('/:id', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    assignmentRuleController.updateRule.bind(assignmentRuleController)
  );

  router.delete('/:id', 
    authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
    assignmentRuleController.deleteRule.bind(assignmentRuleController)
  );

  return router;
};

export default router;