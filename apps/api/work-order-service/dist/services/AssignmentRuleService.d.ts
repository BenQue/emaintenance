import { PrismaClient } from '@prisma/client';
import { CreateAssignmentRuleRequest, UpdateAssignmentRuleRequest, AssignmentRuleFilter, AssignmentRuleResponse, AssignmentMatch } from '../types/assignment-rule';
export declare class AssignmentRuleService {
    private prisma;
    private assignmentRuleRepository;
    constructor(prisma: PrismaClient);
    createRule(data: CreateAssignmentRuleRequest, userId: string): Promise<AssignmentRuleResponse>;
    getRuleById(id: string, userId: string): Promise<AssignmentRuleResponse | null>;
    getRules(filter: AssignmentRuleFilter, userId: string): Promise<{
        rules: AssignmentRuleResponse[];
        total: number;
        page: number;
        limit: number;
    }>;
    updateRule(id: string, data: UpdateAssignmentRuleRequest, userId: string): Promise<AssignmentRuleResponse | null>;
    deleteRule(id: string, userId: string): Promise<boolean>;
    findMatchingRule(workOrderData: {
        assetType?: string;
        category: string;
        location?: string;
        priority: string;
    }): Promise<AssignmentMatch | null>;
    private isRuleMatching;
    private verifyUserPermissions;
    private verifyTechnician;
}
//# sourceMappingURL=AssignmentRuleService.d.ts.map