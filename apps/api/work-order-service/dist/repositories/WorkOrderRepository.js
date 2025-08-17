"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkOrderRepository = void 0;
const database_1 = require("@emaintenance/database");
class WorkOrderRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const workOrder = await this.prisma.workOrder.create({
            data: {
                title: data.title,
                description: data.description || '无详细描述', // Provide default description
                category: data.category,
                reason: data.reason,
                location: data.location,
                priority: data.priority,
                assetId: data.assetId, // assetId is guaranteed to be set by service layer
                createdById: data.createdById,
                attachments: data.attachments || [],
            },
            include: {
                asset: {
                    select: {
                        id: true,
                        assetCode: true,
                        name: true,
                        location: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        return workOrder;
    }
    async findById(id) {
        try {
            console.log(`[DEBUG] WorkOrderRepository.findById: Searching for work order ID: ${id}`);
            const workOrder = await this.prisma.workOrder.findUnique({
                where: { id },
                include: {
                    asset: {
                        select: {
                            id: true,
                            assetCode: true,
                            name: true,
                            location: true,
                            description: true,
                            model: true,
                            manufacturer: true,
                            serialNumber: true,
                            isActive: true,
                        },
                    },
                    createdBy: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            });
            if (workOrder) {
                console.log(`[DEBUG] WorkOrderRepository.findById: Found work order "${workOrder.title}" with asset "${workOrder.asset.name}"`);
            }
            else {
                console.log(`[DEBUG] WorkOrderRepository.findById: No work order found with ID: ${id}`);
            }
            return workOrder;
        }
        catch (error) {
            console.error(`[ERROR] WorkOrderRepository.findById: Database query failed for ID ${id}:`, error);
            throw error;
        }
    }
    async findMany(filters = {}, page = 1, limit = 20) {
        const where = this.buildWhereClause(filters);
        const orderBy = this.buildOrderByClause(filters.sortBy, filters.sortOrder);
        const [workOrders, total] = await Promise.all([
            this.prisma.workOrder.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy,
                include: {
                    asset: {
                        select: {
                            id: true,
                            assetCode: true,
                            name: true,
                            location: true,
                        },
                    },
                    createdBy: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            }),
            this.prisma.workOrder.count({ where }),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            workOrders: workOrders,
            total,
            page,
            limit,
            totalPages,
        };
    }
    async update(id, data) {
        const updateData = {};
        if (data.title !== undefined)
            updateData.title = data.title;
        if (data.description !== undefined)
            updateData.description = data.description;
        if (data.category !== undefined)
            updateData.category = data.category;
        if (data.reason !== undefined)
            updateData.reason = data.reason;
        if (data.location !== undefined)
            updateData.location = data.location;
        if (data.priority !== undefined)
            updateData.priority = data.priority;
        if (data.status !== undefined) {
            updateData.status = data.status;
            // Set timestamps based on status changes
            if (data.status === database_1.WorkOrderStatus.IN_PROGRESS && !updateData.startedAt) {
                updateData.startedAt = new Date();
            }
            if (data.status === database_1.WorkOrderStatus.COMPLETED && !updateData.completedAt) {
                updateData.completedAt = new Date();
            }
        }
        if (data.solution !== undefined)
            updateData.solution = data.solution;
        if (data.faultCode !== undefined)
            updateData.faultCode = data.faultCode;
        if (data.assignedToId !== undefined)
            updateData.assignedToId = data.assignedToId;
        if (data.attachments !== undefined)
            updateData.attachments = data.attachments;
        try {
            const workOrder = await this.prisma.workOrder.update({
                where: { id },
                data: updateData,
                include: {
                    asset: {
                        select: {
                            id: true,
                            assetCode: true,
                            name: true,
                            location: true,
                        },
                    },
                    createdBy: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            });
            return workOrder;
        }
        catch (error) {
            return null;
        }
    }
    async delete(id) {
        try {
            await this.prisma.workOrder.delete({
                where: { id },
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async getStatistics(filters = {}) {
        const where = {};
        if (filters.startDate || filters.endDate) {
            where.reportedAt = {};
            if (filters.startDate) {
                where.reportedAt.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.reportedAt.lte = filters.endDate;
            }
        }
        const [total, statusCounts, priorityCounts, completedWorkOrders,] = await Promise.all([
            this.prisma.workOrder.count({ where }),
            this.prisma.workOrder.groupBy({
                by: ['status'],
                where,
                _count: true,
            }),
            this.prisma.workOrder.groupBy({
                by: ['priority'],
                where,
                _count: true,
            }),
            this.prisma.workOrder.findMany({
                where: {
                    ...where,
                    status: database_1.WorkOrderStatus.COMPLETED,
                    completedAt: { not: null },
                },
                select: {
                    reportedAt: true,
                    completedAt: true,
                },
            }),
        ]);
        // Initialize status counts
        const byStatus = {
            [database_1.WorkOrderStatus.PENDING]: 0,
            [database_1.WorkOrderStatus.IN_PROGRESS]: 0,
            [database_1.WorkOrderStatus.WAITING_PARTS]: 0,
            [database_1.WorkOrderStatus.COMPLETED]: 0,
            [database_1.WorkOrderStatus.CANCELLED]: 0,
        };
        statusCounts.forEach((count) => {
            byStatus[count.status] = count._count;
        });
        // Initialize priority counts
        const byPriority = {
            [database_1.Priority.LOW]: 0,
            [database_1.Priority.MEDIUM]: 0,
            [database_1.Priority.HIGH]: 0,
            [database_1.Priority.URGENT]: 0,
        };
        priorityCounts.forEach((count) => {
            byPriority[count.priority] = count._count;
        });
        // Calculate average resolution time in hours
        let averageResolutionTime = null;
        if (completedWorkOrders.length > 0) {
            const totalResolutionTime = completedWorkOrders.reduce((sum, wo) => {
                const resolutionTime = new Date(wo.completedAt).getTime() - new Date(wo.reportedAt).getTime();
                return sum + resolutionTime;
            }, 0);
            averageResolutionTime = totalResolutionTime / completedWorkOrders.length / (1000 * 60 * 60); // Convert to hours
        }
        return {
            total,
            byStatus,
            byPriority,
            averageResolutionTime,
        };
    }
    async getFilterOptions() {
        try {
            console.log('Starting getFilterOptions query...');
            const [categoriesResult, assetsResult, usersResult] = await Promise.all([
                this.prisma.workOrder.findMany({
                    select: { category: true },
                    distinct: ['category'],
                }).catch(error => {
                    console.error('Error fetching categories:', error);
                    throw error;
                }),
                this.prisma.asset.findMany({
                    where: { isActive: true },
                    select: {
                        id: true,
                        assetCode: true,
                        name: true,
                    },
                    orderBy: { assetCode: 'asc' },
                }).catch(error => {
                    console.error('Error fetching assets:', error);
                    throw error;
                }),
                this.prisma.user.findMany({
                    where: {
                        isActive: true,
                        role: { in: ['TECHNICIAN', 'SUPERVISOR', 'ADMIN'] }
                    },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
                }).catch(error => {
                    console.error('Error fetching users:', error);
                    throw error;
                }),
            ]);
            console.log('Successfully fetched filter options data');
            const result = {
                statuses: Object.values(database_1.WorkOrderStatus),
                priorities: Object.values(database_1.Priority),
                categories: categoriesResult.map(item => item.category),
                assets: assetsResult,
                users: usersResult.map(user => ({
                    id: user.id,
                    name: `${user.firstName} ${user.lastName}`,
                    role: user.role,
                })),
            };
            console.log('Filter options result:', {
                statusCount: result.statuses.length,
                priorityCount: result.priorities.length,
                categoryCount: result.categories.length,
                assetCount: result.assets.length,
                userCount: result.users.length,
            });
            return result;
        }
        catch (error) {
            console.error('Error in getFilterOptions repository method:', error);
            throw error;
        }
    }
    async findManyForCSV(filters = {}) {
        const where = this.buildWhereClause(filters);
        const orderBy = this.buildOrderByClause(filters.sortBy, filters.sortOrder);
        const workOrders = await this.prisma.workOrder.findMany({
            where,
            orderBy,
            include: {
                asset: {
                    select: {
                        assetCode: true,
                        name: true,
                    },
                },
                createdBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
                assignedTo: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
                resolutionRecord: {
                    select: {
                        solutionDescription: true,
                    },
                },
            },
        });
        return workOrders.map(wo => ({
            id: wo.id,
            title: wo.title,
            description: wo.description,
            category: wo.category,
            reason: wo.reason,
            location: wo.location,
            priority: wo.priority,
            status: wo.status,
            reportedAt: wo.reportedAt,
            startedAt: wo.startedAt,
            completedAt: wo.completedAt,
            solution: wo.solution,
            faultCode: wo.faultCode,
            assetCode: wo.asset.assetCode,
            assetName: wo.asset.name,
            createdBy: `${wo.createdBy.firstName} ${wo.createdBy.lastName}`,
            assignedTo: wo.assignedTo ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}` : null,
            resolutionDescription: wo.resolutionRecord?.solutionDescription || null,
        }));
    }
    buildWhereClause(filters) {
        const where = {};
        if (filters.status) {
            // Handle special "NOT_COMPLETED" status to exclude completed work orders
            if (filters.status === 'NOT_COMPLETED') {
                where.status = {
                    not: database_1.WorkOrderStatus.COMPLETED
                };
            }
            else {
                where.status = filters.status;
            }
        }
        if (filters.priority) {
            where.priority = filters.priority;
        }
        if (filters.assetId) {
            where.assetId = filters.assetId;
        }
        if (filters.createdById) {
            where.createdById = filters.createdById;
        }
        if (filters.assignedToId) {
            where.assignedToId = filters.assignedToId;
        }
        if (filters.category) {
            where.category = { contains: filters.category, mode: 'insensitive' };
        }
        if (filters.startDate || filters.endDate) {
            where.reportedAt = {};
            if (filters.startDate) {
                where.reportedAt.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.reportedAt.lte = filters.endDate;
            }
        }
        // Full-text search across multiple fields
        if (filters.search && filters.search.trim()) {
            where.OR = this.buildSearchConditions(filters.search.trim());
        }
        return where;
    }
    buildOrderByClause(sortBy, sortOrder) {
        const order = sortOrder === 'asc' ? 'asc' : 'desc';
        switch (sortBy) {
            case 'title':
                return { title: order };
            case 'priority':
                return { priority: order };
            case 'status':
                return { status: order };
            case 'completedAt':
                return { completedAt: order };
            case 'reportedAt':
            default:
                return { reportedAt: order };
        }
    }
    /**
     * Build search conditions for full-text search across multiple fields.
     * Optimized to minimize database query complexity and improve performance.
     */
    buildSearchConditions(searchTerm) {
        const searchMode = 'insensitive';
        const containsCondition = { contains: searchTerm, mode: searchMode };
        return [
            // Direct work order fields (most common searches)
            { title: containsCondition },
            { description: containsCondition },
            { category: containsCondition },
            { reason: containsCondition },
            { solution: containsCondition },
            // Related asset fields
            {
                asset: {
                    OR: [
                        { assetCode: containsCondition },
                        { name: containsCondition },
                    ]
                }
            },
            // Resolution record (may not always exist)
            {
                resolutionRecord: {
                    solutionDescription: containsCondition
                }
            },
        ];
    }
}
exports.WorkOrderRepository = WorkOrderRepository;
