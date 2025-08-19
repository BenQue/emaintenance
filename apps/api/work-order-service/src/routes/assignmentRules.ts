import express from 'express';
import { PrismaClient } from '@prisma/client';
import { UserRole } from '@emaintenance/database';
import { AssignmentRuleController } from '../controllers/AssignmentRuleController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();
const assignmentRuleController = new AssignmentRuleController(prisma);

// All routes require authentication
router.use(authenticate);

// Assignment rule CRUD routes - require supervisor or admin role
router.post('/', 
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
  (req, res) => assignmentRuleController.createRule(req, res)
);

router.get('/', 
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
  (req, res) => assignmentRuleController.getRules(req, res)
);

router.get('/:id', 
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
  (req, res) => assignmentRuleController.getRuleById(req, res)
);

router.put('/:id', 
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
  (req, res) => assignmentRuleController.updateRule(req, res)
);

router.delete('/:id', 
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN), 
  (req, res) => assignmentRuleController.deleteRule(req, res)
);

export default router;