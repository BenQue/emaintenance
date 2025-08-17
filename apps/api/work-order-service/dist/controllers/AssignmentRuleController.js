"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentRuleController = void 0;
const AssignmentRuleService_1 = require("../services/AssignmentRuleService");
const zod_1 = require("zod");
// Validation schemas
const createAssignmentRuleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    priority: zod_1.z.number().int().min(0).max(100).optional(),
    isActive: zod_1.z.boolean().optional(),
    assetTypes: zod_1.z.array(zod_1.z.string()).default([]),
    categories: zod_1.z.array(zod_1.z.string()).default([]),
    locations: zod_1.z.array(zod_1.z.string()).default([]),
    priorities: zod_1.z.array(zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])).default([]),
    assignToId: zod_1.z.string().min(1, 'Assigned technician is required'),
});
const updateAssignmentRuleSchema = createAssignmentRuleSchema.partial();
const assignmentRuleFilterSchema = zod_1.z.object({
    isActive: zod_1.z.string().transform(val => val === 'true').optional(),
    assignToId: zod_1.z.string().optional(),
    page: zod_1.z.string().transform(val => parseInt(val) || 1).optional(),
    limit: zod_1.z.string().transform(val => parseInt(val) || 10).optional(),
});
class AssignmentRuleController {
    constructor(prisma) {
        this.prisma = prisma;
        this.assignmentRuleService = new AssignmentRuleService_1.AssignmentRuleService(prisma);
    }
    async createRule(req, res) {
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors,
                });
                return;
            }
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to create assignment rule',
            });
        }
    }
    async getRuleById(req, res) {
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
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get assignment rule',
            });
        }
    }
    async getRules(req, res) {
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors,
                });
                return;
            }
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to get assignment rules',
            });
        }
    }
    async updateRule(req, res) {
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors,
                });
                return;
            }
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to update assignment rule',
            });
        }
    }
    async deleteRule(req, res) {
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
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to delete assignment rule',
            });
        }
    }
}
exports.AssignmentRuleController = AssignmentRuleController;
