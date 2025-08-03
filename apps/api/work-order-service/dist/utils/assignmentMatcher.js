"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentMatcher = void 0;
class AssignmentMatcher {
    /**
     * Find the best matching assignment rule for a work order
     * Rules are evaluated in priority order (highest priority first)
     */
    static findBestMatch(workOrderData, rules) {
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
    static isRuleMatching(rule, workOrderData) {
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
            // Support partial location matching (case-insensitive)
            const locationMatches = rule.locations.some(ruleLocation => workOrderData.location.toLowerCase().includes(ruleLocation.toLowerCase()) ||
                ruleLocation.toLowerCase().includes(workOrderData.location.toLowerCase()));
            if (!locationMatches) {
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
    /**
     * Validate that assignment rule conditions are properly configured
     */
    static validateRuleConditions(rule) {
        const errors = [];
        // At least one condition must be specified
        const hasConditions = rule.assetTypes.length > 0 ||
            rule.categories.length > 0 ||
            rule.locations.length > 0 ||
            rule.priorities.length > 0;
        if (!hasConditions) {
            errors.push('At least one matching condition must be specified');
        }
        // Validate priority values if specified
        const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        rule.priorities.forEach(priority => {
            if (!validPriorities.includes(priority)) {
                errors.push(`Invalid priority value: ${priority}`);
            }
        });
        return errors;
    }
}
exports.AssignmentMatcher = AssignmentMatcher;
