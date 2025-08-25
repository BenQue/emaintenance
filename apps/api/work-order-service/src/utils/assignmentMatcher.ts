import { AssignmentRuleResponse } from '../types/assignment-rule';

export interface WorkOrderMatchData {
  assetType?: string;
  category: string;
  location?: string;
  priority: string;
}

export class AssignmentMatcher {
  /**
   * Find the best matching assignment rule for a work order
   * Rules are evaluated in priority order (highest priority first)
   */
  static findBestMatch(
    workOrderData: WorkOrderMatchData,
    rules: AssignmentRuleResponse[]
  ): AssignmentRuleResponse | null {
    // Sort rules by priority (highest first), then by creation date (oldest first)
    const sortedRules = rules
      .filter(rule => rule.isActive)
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.createdAt.getTime() - b.createdAt.getTime(); // Older rules first for tie-breaking
      });

    for (const rule of sortedRules) {
      if (this.isRuleMatching(rule, workOrderData)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Check if a specific rule matches the work order data
   */
  private static isRuleMatching(
    rule: AssignmentRuleResponse,
    workOrderData: WorkOrderMatchData
  ): boolean {
    // Check asset type match (if rule has asset type filter)
    if (rule.assetTypes.length > 0 && workOrderData.assetType && !rule.assetTypes.includes(workOrderData.assetType)) {
      return false;
    }

    // Check category match (if rule has category filter)
    if (rule.categories.length > 0 && !rule.categories.includes(workOrderData.category)) {
      return false;
    }

    // Check location match (if rule has location filter)
    if (rule.locations.length > 0 && workOrderData.location && !rule.locations.includes(workOrderData.location)) {
      return false;
    }

    // Check priority match
    if (rule.priorities.length > 0 && !rule.priorities.includes(workOrderData.priority)) {
      return false;
    }

    return true;
  }

  /**
   * Validate that assignment rule conditions are properly configured
   */
  static validateRuleConditions(rule: {
    categories: string[];
    locations: string[];
    priorities: string[];
    assetTypes: string[];
  }): string[] {
    const errors: string[] = [];

    // At least one condition must be specified
    const hasConditions = 
      rule.categories.length > 0 ||
      rule.locations.length > 0 ||
      rule.priorities.length > 0 ||
      rule.assetTypes.length > 0;

    if (!hasConditions) {
      errors.push('At least one matching condition must be specified');
    }

    // Validate priority values if specified
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    for (const priority of rule.priorities) {
      if (!validPriorities.includes(priority)) {
        errors.push(`Invalid priority value: ${priority}`);
      }
    }

    return errors;
  }
}