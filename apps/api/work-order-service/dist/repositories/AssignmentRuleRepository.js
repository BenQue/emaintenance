"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentRuleRepository = void 0;
class AssignmentRuleRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const rule = await this.prisma.assignmentRule.create({
            data,
            include: {
                assignTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        return this.formatResponse(rule);
    }
    async findById(id) {
        const rule = await this.prisma.assignmentRule.findUnique({
            where: { id },
            include: {
                assignTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        return rule ? this.formatResponse(rule) : null;
    }
    async findMany(filter) {
        const { page = 1, limit = 10, ...whereClause } = filter;
        const skip = (page - 1) * limit;
        const [rules, total] = await Promise.all([
            this.prisma.assignmentRule.findMany({
                where: whereClause,
                include: {
                    assignTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
                orderBy: [
                    { priority: 'desc' },
                    { createdAt: 'desc' },
                ],
                skip,
                take: limit,
            }),
            this.prisma.assignmentRule.count({ where: whereClause }),
        ]);
        return {
            rules: rules.map(this.formatResponse),
            total,
            page,
            limit,
        };
    }
    async update(id, data) {
        try {
            const rule = await this.prisma.assignmentRule.update({
                where: { id },
                data,
                include: {
                    assignTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            });
            return this.formatResponse(rule);
        }
        catch (error) {
            return null;
        }
    }
    async delete(id) {
        try {
            await this.prisma.assignmentRule.delete({
                where: { id },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async findActiveRulesByPriority() {
        const rules = await this.prisma.assignmentRule.findMany({
            where: { isActive: true },
            include: {
                assignTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'asc' },
            ],
        });
        return rules.map(this.formatResponse);
    }
    formatResponse(rule) {
        return {
            id: rule.id,
            name: rule.name,
            priority: rule.priority,
            isActive: rule.isActive,
            assetTypes: rule.assetTypes,
            categories: rule.categories,
            locations: rule.locations,
            priorities: rule.priorities,
            assignToId: rule.assignToId,
            assignTo: rule.assignTo,
            createdAt: rule.createdAt,
            updatedAt: rule.updatedAt,
        };
    }
}
exports.AssignmentRuleRepository = AssignmentRuleRepository;
