import { PrismaClient } from '@prisma/client';
import { CreateAssignmentRuleRequest, UpdateAssignmentRuleRequest, AssignmentRuleFilter, AssignmentRuleResponse } from '../types/assignment-rule';
export declare class AssignmentRuleRepository {
    private prisma;
    constructor(prisma: PrismaClient);
    create(data: CreateAssignmentRuleRequest): Promise<AssignmentRuleResponse>;
    findById(id: string): Promise<AssignmentRuleResponse | null>;
    findMany(filter: AssignmentRuleFilter): Promise<{
        rules: AssignmentRuleResponse[];
        total: number;
        page: number;
        limit: number;
    }>;
    update(id: string, data: UpdateAssignmentRuleRequest): Promise<AssignmentRuleResponse | null>;
    delete(id: string): Promise<boolean>;
    findActiveRulesByPriority(): Promise<AssignmentRuleResponse[]>;
    private formatResponse;
}
//# sourceMappingURL=AssignmentRuleRepository.d.ts.map