import { PrismaClient } from '@emaintenance/database';
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

    // Verify assigned role is valid
    await this.verifyAssignedRole(data.assignedRole);

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

    // If assignedRole is being updated, verify the new role
    if (data.assignedRole) {
      await this.verifyAssignedRole(data.assignedRole);
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
          priority: parseInt(rule.priority),
          assignToId: rule.assignTo.id,
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
    // Check category match (if rule has category filter)
    if (rule.categoryId && rule.categoryId !== workOrderData.category) {
      return false;
    }

    // Check location match (if rule has location filter)
    if (rule.locationId && rule.locationId !== workOrderData.location) {
      return false;
    }

    // Check priority match
    if (rule.priority !== workOrderData.priority) {
      return false;
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

  private async verifyAssignedRole(assignedRole: string): Promise<void> {
    const userRole = await this.prisma.userRole.findUnique({
      where: { name: assignedRole },
    });

    if (!userRole) {
      throw new Error(`Assigned role "${assignedRole}" not found`);
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