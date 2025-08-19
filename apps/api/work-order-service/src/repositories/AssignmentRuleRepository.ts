import { PrismaClient } from '@prisma/client';
import { AssignmentRule, User } from '@emaintenance/database';
import {
  CreateAssignmentRuleRequest,
  UpdateAssignmentRuleRequest,
  AssignmentRuleFilter,
  AssignmentRuleResponse,
} from '../types/assignment-rule';

export class AssignmentRuleRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateAssignmentRuleRequest): Promise<AssignmentRuleResponse> {
    const rule = await this.prisma.assignmentRule.create({
      data,
      include: {
        assignTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return this.formatResponse(rule);
  }

  async findById(id: string): Promise<AssignmentRuleResponse | null> {
    const rule = await this.prisma.assignmentRule.findUnique({
      where: { id },
      include: {
        assignTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return rule ? this.formatResponse(rule) : null;
  }

  async findMany(filter: AssignmentRuleFilter): Promise<{
    rules: AssignmentRuleResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, ...whereClause } = filter;
    const skip = (page - 1) * limit;

    const [rules, total] = await Promise.all([
      this.prisma.assignmentRule.findMany({
        where: whereClause,
        include: {
          assignTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.assignmentRule.count({ where: whereClause }),
    ]);

    return {
      rules: rules.map(this.formatResponse),
      total,
      page,
      limit,
    };
  }

  async update(id: string, data: UpdateAssignmentRuleRequest): Promise<AssignmentRuleResponse | null> {
    try {
      const rule = await this.prisma.assignmentRule.update({
        where: { id },
        data,
        include: {
          assignTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return this.formatResponse(rule);
    } catch (error) {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.assignmentRule.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async findActiveRulesByPriority(): Promise<AssignmentRuleResponse[]> {
    const rules = await this.prisma.assignmentRule.findMany({
      where: { isActive: true },
      include: {
        assignTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return rules.map(this.formatResponse);
  }

  private formatResponse(rule: AssignmentRule & {
    assignTo: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }): AssignmentRuleResponse {
    return {
      id: rule.id,
      name: rule.name,
      priority: rule.priority,
      isActive: rule.isActive,
      assetTypes: rule.assetTypes,
      categories: rule.categories,
      locations: rule.locations,
      priorities: rule.priorities,
      assignToId: rule.assignToId,
      assignTo: rule.assignTo,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}