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
          return parseInt(b.priority) - parseInt(a.priority); // Higher priority first
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

  /**
   * Validate that assignment rule conditions are properly configured
   */
  static validateRuleConditions(rule: {
    categoryId?: string;
    locationId?: string;
    priority: string;
  }): string[] {
    const errors: string[] = [];

    // At least one condition must be specified
    const hasConditions = 
      rule.categoryId ||
      rule.locationId ||
      rule.priority;

    if (!hasConditions) {
      errors.push('At least one matching condition must be specified');
    }

    // Validate priority values if specified
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(rule.priority)) {
      errors.push(`Invalid priority value: ${rule.priority}`);
    }

    return errors;
  }
}