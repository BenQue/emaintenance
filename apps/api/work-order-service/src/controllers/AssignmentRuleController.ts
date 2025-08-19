import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AssignmentRuleService } from '../services/AssignmentRuleService';
import { CreateAssignmentRuleRequest, UpdateAssignmentRuleRequest } from '../types/assignment-rule';
import { z } from 'zod';

// Validation schemas
const createAssignmentRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  priority: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  assetTypes: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  priorities: z.array(z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])).default([]),
  assignToId: z.string().min(1, 'Assigned technician is required'),
});

const updateAssignmentRuleSchema = createAssignmentRuleSchema.partial();

const assignmentRuleFilterSchema = z.object({
  isActive: z.string().transform(val => val === 'true').optional(),
  assignToId: z.string().optional(),
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => parseInt(val) || 10).optional(),
});

export class AssignmentRuleController {
  private assignmentRuleService: AssignmentRuleService;

  constructor(private prisma: PrismaClient) {
    this.assignmentRuleService = new AssignmentRuleService(prisma);
  }

  async createRule(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createAssignmentRuleSchema.parse(req.body);
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const rule = await this.assignmentRuleService.createRule(validatedData, userId);

      res.status(201).json({
        success: true,
        data: rule,
        message: 'Assignment rule created successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.issues,
        });
        return;
      }

      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create assignment rule',
      });
    }
  }

  async getRuleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const rule = await this.assignmentRuleService.getRuleById(id, userId);

      if (!rule) {
        res.status(404).json({ error: 'Assignment rule not found' });
        return;
      }

      res.json({
        success: true,
        data: rule,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get assignment rule',
      });
    }
  }

  async getRules(req: Request, res: Response): Promise<void> {
    try {
      const filters = assignmentRuleFilterSchema.parse(req.query);
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const result = await this.assignmentRuleService.getRules(filters, userId);

      res.json({
        success: true,
        data: result.rules,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.issues,
        });
        return;
      }

      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get assignment rules',
      });
    }
  }

  async updateRule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = updateAssignmentRuleSchema.parse(req.body);
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const rule = await this.assignmentRuleService.updateRule(id, validatedData, userId);

      if (!rule) {
        res.status(404).json({ error: 'Assignment rule not found' });
        return;
      }

      res.json({
        success: true,
        data: rule,
        message: 'Assignment rule updated successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.issues,
        });
        return;
      }

      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update assignment rule',
      });
    }
  }

  async deleteRule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const success = await this.assignmentRuleService.deleteRule(id, userId);

      if (!success) {
        res.status(404).json({ error: 'Assignment rule not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Assignment rule deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete assignment rule',
      });
    }
  }
}