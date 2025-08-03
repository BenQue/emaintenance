import { AssignmentRuleResponse } from '../types/assignment-rule';
export interface WorkOrderMatchData {
    assetType?: string;
    category: string;
    location?: string;
    priority: string;
}
export declare class AssignmentMatcher {
    /**
     * Find the best matching assignment rule for a work order
     * Rules are evaluated in priority order (highest priority first)
     */
    static findBestMatch(workOrderData: WorkOrderMatchData, rules: AssignmentRuleResponse[]): AssignmentRuleResponse | null;
    /**
     * Check if a specific rule matches the work order data
     */
    private static isRuleMatching;
    /**
     * Validate that assignment rule conditions are properly configured
     */
    static validateRuleConditions(rule: {
        assetTypes: string[];
        categories: string[];
        locations: string[];
        priorities: string[];
    }): string[];
}
//# sourceMappingURL=assignmentMatcher.d.ts.map