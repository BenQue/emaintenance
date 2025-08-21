import { AssignmentRule, NotificationType } from '@emaintenance/database';

export interface CreateAssignmentRuleRequest {
  name: string;
  description?: string;
  categoryId?: string;
  locationId?: string;
  priority: string;
  assignedRole: string;
  isActive?: boolean;
}

export interface UpdateAssignmentRuleRequest {
  name?: string;
  description?: string;
  categoryId?: string;
  locationId?: string;
  priority?: string;
  assignedRole?: string;
  isActive?: boolean;
}

export interface AssignmentRuleResponse {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  locationId?: string;
  priority: string;
  assignedRole: string;
  isActive: boolean;
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