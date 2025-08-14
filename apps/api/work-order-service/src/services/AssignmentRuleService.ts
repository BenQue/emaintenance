import { PrismaClient } from '@prisma/client';
import { UserRole } from '@emaintenance/database';
import { AssignmentRuleRepository } from '../repositories/AssignmentRuleRepository';
import {
  CreateAssignmentRuleRequest,
  UpdateAssignmentRuleRequest,
  AssignmentRuleFilter,
  AssignmentRuleResponse,
  AssignmentMatch,
} from '../types/assignment-rule';

export class AssignmentRuleService {
  private assignmentRuleRepository: AssignmentRuleRepository;

  constructor(private prisma: PrismaClient) {
    this.assignmentRuleRepository = new AssignmentRuleRepository(prisma);
  }

  async createRule(
    data: CreateAssignmentRuleRequest,
    userId: string
  ): Promise<AssignmentRuleResponse> {
    // Verify user has supervisor role
    await this.verifyUserPermissions(userId, 'create');

    // Verify assignTo user exists and is a technician
    await this.verifyTechnician(data.assignToId);

    return this.assignmentRuleRepository.create(data);
  }

  async getRuleById(id: string, userId: string): Promise<AssignmentRuleResponse | null> {
    await this.verifyUserPermissions(userId, 'read');
    return this.assignmentRuleRepository.findById(id);
  }

  async getRules(
    filter: AssignmentRuleFilter,
    userId: string
  ): Promise<{
    rules: AssignmentRuleResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    await this.verifyUserPermissions(userId, 'read');
    return this.assignmentRuleRepository.findMany(filter);
  }

  async updateRule(
    id: string,
    data: UpdateAssignmentRuleRequest,
    userId: string
  ): Promise<AssignmentRuleResponse | null> {
    await this.verifyUserPermissions(userId, 'update');

    // If assignToId is being updated, verify the new technician
    if (data.assignToId) {
      await this.verifyTechnician(data.assignToId);
    }

    return this.assignmentRuleRepository.update(id, data);
  }

  async deleteRule(id: string, userId: string): Promise<boolean> {
    await this.verifyUserPermissions(userId, 'delete');
    return this.assignmentRuleRepository.delete(id);
  }

  async findMatchingRule(workOrderData: {
    assetType?: string;
    category: string;
    location?: string;
    priority: string;
  }): Promise<AssignmentMatch | null> {
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

  private isRuleMatching(
    rule: AssignmentRuleResponse,
    workOrderData: {
      assetType?: string;
      category: string;
      location?: string;
      priority: string;
    }
  ): boolean {
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

  private async verifyUserPermissions(userId: string, action: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    if (user.role !== UserRole.SUPERVISOR && user.role !== UserRole.ADMIN) {
      throw new Error(`Access denied: ${action} assignment rules requires supervisor or admin role`);
    }
  }

  private async verifyTechnician(technicianId: string): Promise<void> {
    const technician = await this.prisma.user.findUnique({
      where: { id: technicianId },
      select: { role: true, isActive: true },
    });

    if (!technician || !technician.isActive) {
      throw new Error('Assigned technician not found or inactive');
    }

    if (technician.role !== UserRole.TECHNICIAN) {
      throw new Error('Assigned user must have technician role');
    }
  }
}