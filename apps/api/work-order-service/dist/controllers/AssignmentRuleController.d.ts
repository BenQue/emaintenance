import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
export declare class AssignmentRuleController {
    private prisma;
    private assignmentRuleService;
    constructor(prisma: PrismaClient);
    createRule(req: Request, res: Response): Promise<void>;
    getRuleById(req: Request, res: Response): Promise<void>;
    getRules(req: Request, res: Response): Promise<void>;
    updateRule(req: Request, res: Response): Promise<void>;
    deleteRule(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=AssignmentRuleController.d.ts.map