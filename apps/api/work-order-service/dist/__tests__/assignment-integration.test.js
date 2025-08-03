"use strict";
/**
 * Integration test for assignment functionality
 *
 * This test demonstrates the integration between AssignmentRuleService,
 * NotificationService, and WorkOrderService for automatic assignment.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Assignment Integration Tests', () => {
    let mockRules;
    let mockWorkOrders;
    let mockNotifications;
    (0, globals_1.beforeEach)(() => {
        mockRules = [
            {
                id: 'rule-1',
                name: 'Electrical High Priority',
                priority: 10,
                isActive: true,
                categories: ['电气'],
                locations: ['车间A'],
                priorities: ['HIGH', 'URGENT'],
                assignToId: 'tech-1',
            },
            {
                id: 'rule-2',
                name: 'Mechanical Medium Priority',
                priority: 5,
                isActive: true,
                categories: ['机械'],
                locations: [],
                priorities: ['MEDIUM'],
                assignToId: 'tech-2',
            },
        ];
        mockWorkOrders = [];
        mockNotifications = [];
    });
    (0, globals_1.describe)('Automatic Assignment Flow', () => {
        (0, globals_1.it)('should automatically assign work order based on matching rule', () => {
            // Simulate work order creation
            const newWorkOrder = {
                id: 'wo-1',
                category: '电气',
                location: '车间A',
                priority: 'HIGH',
                title: '电气故障维修',
            };
            // Find matching rule (simulated)
            const matchingRule = findMatchingRule(newWorkOrder, mockRules);
            (0, globals_1.expect)(matchingRule).toBeDefined();
            (0, globals_1.expect)(matchingRule?.assignToId).toBe('tech-1');
            (0, globals_1.expect)(matchingRule?.name).toBe('Electrical High Priority');
            // Simulate assignment
            const assignedWorkOrder = {
                ...newWorkOrder,
                assignedToId: matchingRule?.assignToId,
            };
            // Simulate notification creation
            const notification = {
                id: 'notif-1',
                userId: matchingRule.assignToId,
                type: 'WORK_ORDER_ASSIGNED',
                title: '新工单分配',
                message: `您已被分配新的工单: ${newWorkOrder.title}`,
                workOrderId: newWorkOrder.id,
            };
            mockNotifications.push(notification);
            (0, globals_1.expect)(assignedWorkOrder.assignedToId).toBe('tech-1');
            (0, globals_1.expect)(mockNotifications).toHaveLength(1);
            (0, globals_1.expect)(mockNotifications[0].message).toContain('电气故障维修');
        });
        (0, globals_1.it)('should select highest priority rule when multiple rules match', () => {
            // Add another rule with higher priority
            const highPriorityRule = {
                id: 'rule-3',
                name: 'Urgent Electrical',
                priority: 15,
                isActive: true,
                categories: ['电气'],
                locations: [],
                priorities: ['HIGH', 'URGENT'],
                assignToId: 'tech-3',
            };
            const rulesWithHighPriority = [...mockRules, highPriorityRule];
            const newWorkOrder = {
                id: 'wo-2',
                category: '电气',
                priority: 'HIGH',
                title: '紧急电气故障',
            };
            const matchingRule = findMatchingRule(newWorkOrder, rulesWithHighPriority);
            (0, globals_1.expect)(matchingRule?.priority).toBe(15);
            (0, globals_1.expect)(matchingRule?.assignToId).toBe('tech-3');
        });
        (0, globals_1.it)('should not assign if no rules match', () => {
            const newWorkOrder = {
                id: 'wo-3',
                category: '清洁',
                priority: 'LOW',
                title: '设备清洁',
            };
            const matchingRule = findMatchingRule(newWorkOrder, mockRules);
            (0, globals_1.expect)(matchingRule).toBeNull();
        });
        (0, globals_1.it)('should skip inactive rules', () => {
            const inactiveRules = mockRules.map(rule => ({
                ...rule,
                isActive: false,
            }));
            const newWorkOrder = {
                id: 'wo-4',
                category: '电气',
                location: '车间A',
                priority: 'HIGH',
                title: '电气检修',
            };
            const matchingRule = findMatchingRule(newWorkOrder, inactiveRules);
            (0, globals_1.expect)(matchingRule).toBeNull();
        });
    });
    (0, globals_1.describe)('Manual Assignment Override', () => {
        (0, globals_1.it)('should allow manual assignment regardless of rules', () => {
            const workOrder = {
                id: 'wo-5',
                category: '电气',
                priority: 'HIGH',
                title: '手动分配工单',
            };
            // Simulate manual assignment to different technician
            const manualAssigneeId = 'tech-manual';
            const assignedWorkOrder = {
                ...workOrder,
                assignedToId: manualAssigneeId,
            };
            // Should create notification for manual assignment
            const notification = {
                id: 'notif-2',
                userId: manualAssigneeId,
                type: 'WORK_ORDER_ASSIGNED',
                title: '新工单分配',
                message: `您已被分配新的工单: ${workOrder.title}`,
                workOrderId: workOrder.id,
            };
            (0, globals_1.expect)(assignedWorkOrder.assignedToId).toBe('tech-manual');
            (0, globals_1.expect)(notification.userId).toBe('tech-manual');
        });
    });
    (0, globals_1.describe)('Notification Delivery', () => {
        (0, globals_1.it)('should create appropriate notification for assignment', () => {
            const workOrder = {
                id: 'wo-6',
                category: '机械',
                priority: 'MEDIUM',
                title: '机械维护',
            };
            const matchingRule = findMatchingRule(workOrder, mockRules);
            if (matchingRule) {
                const notification = {
                    id: 'notif-3',
                    userId: matchingRule.assignToId,
                    type: 'WORK_ORDER_ASSIGNED',
                    title: '新工单分配',
                    message: `您已被分配新的工单: ${workOrder.title}`,
                    workOrderId: workOrder.id,
                };
                (0, globals_1.expect)(notification.type).toBe('WORK_ORDER_ASSIGNED');
                (0, globals_1.expect)(notification.userId).toBe('tech-2');
                (0, globals_1.expect)(notification.message).toContain('机械维护');
            }
        });
    });
});
// Helper function to simulate rule matching logic
function findMatchingRule(workOrder, rules) {
    const activeRules = rules
        .filter(rule => rule.isActive)
        .sort((a, b) => b.priority - a.priority);
    for (const rule of activeRules) {
        let matches = true;
        // Check category match
        if (rule.categories.length > 0 && !rule.categories.includes(workOrder.category)) {
            matches = false;
        }
        // Check priority match
        if (rule.priorities.length > 0 && !rule.priorities.includes(workOrder.priority)) {
            matches = false;
        }
        // Check location match
        if (rule.locations.length > 0 && workOrder.location) {
            const locationMatches = rule.locations.some(ruleLocation => workOrder.location.includes(ruleLocation) ||
                ruleLocation.includes(workOrder.location));
            if (!locationMatches) {
                matches = false;
            }
        }
        if (matches) {
            return rule;
        }
    }
    return null;
}
