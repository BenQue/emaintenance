import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AssignmentRuleController } from '../controllers/AssignmentRuleController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();
const assignmentRuleController = new AssignmentRuleController(prisma);

// All routes require authentication
router.use(authenticateToken);

// Assignment rule CRUD routes - require supervisor or admin role
router.post('/', 
  requireRole(['SUPERVISOR', 'ADMIN']), 
  (req, res) => assignmentRuleController.createRule(req, res)
);

router.get('/', 
  requireRole(['SUPERVISOR', 'ADMIN']), 
  (req, res) => assignmentRuleController.getRules(req, res)
);

router.get('/:id', 
  requireRole(['SUPERVISOR', 'ADMIN']), 
  (req, res) => assignmentRuleController.getRuleById(req, res)
);

router.put('/:id', 
  requireRole(['SUPERVISOR', 'ADMIN']), 
  (req, res) => assignmentRuleController.updateRule(req, res)
);

router.delete('/:id', 
  requireRole(['SUPERVISOR', 'ADMIN']), 
  (req, res) => assignmentRuleController.deleteRule(req, res)
);

export default router;