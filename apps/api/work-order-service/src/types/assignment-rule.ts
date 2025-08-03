import { AssignmentRule, NotificationType } from '@prisma/client';

export interface CreateAssignmentRuleRequest {
  name: string;
  priority?: number;
  isActive?: boolean;
  assetTypes: string[];
  categories: string[];
  locations: string[];
  priorities: string[];
  assignToId: string;
}

export interface UpdateAssignmentRuleRequest {
  name?: string;
  priority?: number;
  isActive?: boolean;
  assetTypes?: string[];
  categories?: string[];
  locations?: string[];
  priorities?: string[];
  assignToId?: string;
}

export interface AssignmentRuleResponse {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  assetTypes: string[];
  categories: string[];
  locations: string[];
  priorities: string[];
  assignToId: string;
  assignTo: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentRuleFilter {
  isActive?: boolean;
  assignToId?: string;
  page?: number;
  limit?: number;
}

export interface AssignmentMatch {
  ruleId: string;
  ruleName: string;
  priority: number;
  assignToId: string;
}