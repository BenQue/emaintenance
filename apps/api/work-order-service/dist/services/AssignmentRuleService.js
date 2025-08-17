"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentRuleService = void 0;
const database_1 = require("@emaintenance/database");
const AssignmentRuleRepository_1 = require("../repositories/AssignmentRuleRepository");
class AssignmentRuleService {
    constructor(prisma) {
        this.prisma = prisma;
        this.assignmentRuleRepository = new AssignmentRuleRepository_1.AssignmentRuleRepository(prisma);
    }
    async createRule(data, userId) {
        // Verify user has supervisor role
        await this.verifyUserPermissions(userId, 'create');
        // Verify assignTo user exists and is a technician
        await this.verifyTechnician(data.assignToId);
        return this.assignmentRuleRepository.create(data);
    }
    async getRuleById(id, userId) {
        await this.verifyUserPermissions(userId, 'read');
        return this.assignmentRuleRepository.findById(id);
    }
    async getRules(filter, userId) {
        await this.verifyUserPermissions(userId, 'read');
        return this.assignmentRuleRepository.findMany(filter);
    }
    async updateRule(id, data, userId) {
        await this.verifyUserPermissions(userId, 'update');
        // If assignToId is being updated, verify the new technician
        if (data.assignToId) {
            await this.verifyTechnician(data.assignToId);
        }
        return this.assignmentRuleRepository.update(id, data);
    }
    async deleteRule(id, userId) {
        await this.verifyUserPermissions(userId, 'delete');
        return this.assignmentRuleRepository.delete(id);
    }
    async findMatchingRule(workOrderData) {
        const activeRules = await this.assignmentRuleRepository.findActiveRulesByPriority();
        for (const rule of activeRules) {
            if (this.isRuleMatching(rule, workOrderData)) {
                return {
                    ruleId: rule.id,
                    ruleName: rule.name,
                    priority: rule.priority,
                    assignToId: rule.assignToId,
                };
            }
        }
        return null;
    }
    isRuleMatching(rule, workOrderData) {
        // Check asset type match (if rule has asset type filters)
        if (rule.assetTypes.length > 0 && workOrderData.assetType) {
            if (!rule.assetTypes.includes(workOrderData.assetType)) {
                return false;
            }
        }
        // Check category match (if rule has category filters)
        if (rule.categories.length > 0) {
            if (!rule.categories.includes(workOrderData.category)) {
                return false;
            }
        }
        // Check location match (if rule has location filters)
        if (rule.locations.length > 0 && workOrderData.location) {
            if (!rule.locations.includes(workOrderData.location)) {
                return false;
            }
        }
        // Check priority match (if rule has priority filters)
        if (rule.priorities.length > 0) {
            if (!rule.priorities.includes(workOrderData.priority)) {
                return false;
            }
        }
        return true;
    }
    async verifyUserPermissions(userId, action) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, isActive: true },
        });
        if (!user || !user.isActive) {
            throw new Error('User not found or inactive');
        }
        if (user.role !== database_1.UserRole.SUPERVISOR && user.role !== database_1.UserRole.ADMIN) {
            throw new Error(`Access denied: ${action} assignment rules requires supervisor or admin role`);
        }
    }
    async verifyTechnician(technicianId) {
        const technician = await this.prisma.user.findUnique({
            where: { id: technicianId },
            select: { role: true, isActive: true },
        });
        if (!technician || !technician.isActive) {
            throw new Error('Assigned technician not found or inactive');
        }
        if (technician.role !== database_1.UserRole.TECHNICIAN) {
            throw new Error('Assigned user must have technician role');
        }
    }
}
exports.AssignmentRuleService = AssignmentRuleService;
