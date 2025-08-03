"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkOrderService = void 0;
const WorkOrderRepository_1 = require("../repositories/WorkOrderRepository");
const AssignmentRuleService_1 = require("./AssignmentRuleService");
const NotificationService_1 = require("./NotificationService");
class WorkOrderService {
    prisma;
    workOrderRepository;
    assignmentRuleService;
    notificationService;
    constructor(prisma) {
        this.prisma = prisma;
        this.workOrderRepository = new WorkOrderRepository_1.WorkOrderRepository(prisma);
        this.assignmentRuleService = new AssignmentRuleService_1.AssignmentRuleService(prisma);
        this.notificationService = new NotificationService_1.NotificationService(prisma);
    }
    async createWorkOrder(data, createdById) {
        // Validate that the asset exists and is active
        const asset = await this.prisma.asset.findUnique({
            where: { id: data.assetId },
            select: { id: true, isActive: true, location: true }
        });
        if (!asset) {
            throw new Error('Asset not found');
        }
        if (!asset.isActive) {
            throw new Error('Cannot create work order for inactive asset');
        }
        // Use asset location if no location provided
        const workOrderData = {
            ...data,
            location: data.location || asset.location,
        };
        // Create the work order first
        const workOrder = await this.workOrderRepository.create({
            ...workOrderData,
            createdById,
        });
        // Attempt automatic assignment based on rules
        try {
            const assignmentMatch = await this.assignmentRuleService.findMatchingRule({
                category: workOrder.category,
                location: workOrder.location || undefined,
                priority: workOrder.priority,
            });
            if (assignmentMatch) {
                // Assign the work order to the matched technician
                const assignedWorkOrder = await this.workOrderRepository.update(workOrder.id, {
                    assignedToId: assignmentMatch.assignToId,
                });
                // Send notification to assigned technician
                if (assignedWorkOrder?.assignedToId) {
                    await this.notificationService.createWorkOrderAssignmentNotification(workOrder.id, assignedWorkOrder.assignedToId, workOrder.title);
                }
                return assignedWorkOrder || workOrder;
            }
        }
        catch (error) {
            // Log assignment error but don't fail work order creation
            console.warn(`Auto-assignment failed for work order ${workOrder.id}:`, error);
        }
        return workOrder;
    }
    async getWorkOrderById(id) {
        return await this.workOrderRepository.findById(id);
    }
    async getWorkOrders(filters = {}, page = 1, limit = 20) {
        // Validate pagination parameters
        if (page < 1)
            page = 1;
        if (limit < 1 || limit > 100)
            limit = 20;
        return await this.workOrderRepository.findMany(filters, page, limit);
    }
    async updateWorkOrder(id, data, userId) {
        // Check if work order exists and user has permission to update
        const existingWorkOrder = await this.workOrderRepository.findById(id);
        if (!existingWorkOrder) {
            throw new Error('Work order not found');
        }
        // Permission validation with proper separation of concerns
        if (!this.canUserUpdateWorkOrder(existingWorkOrder, userId)) {
            throw new Error('Permission denied: cannot update this work order');
        }
        // Apply role-based field restrictions
        data = this.applyUpdatePermissions(existingWorkOrder, data, userId);
        const updatedWorkOrder = await this.workOrderRepository.update(id, data);
        if (!updatedWorkOrder) {
            throw new Error('Failed to update work order');
        }
        return updatedWorkOrder;
    }
    async deleteWorkOrder(id, userId) {
        // Check if work order exists and user has permission to delete
        const existingWorkOrder = await this.workOrderRepository.findById(id);
        if (!existingWorkOrder) {
            throw new Error('Work order not found');
        }
        // Only creator can delete work order, and only if it's still pending
        if (existingWorkOrder.createdById !== userId) {
            throw new Error('Permission denied: only creator can delete work order');
        }
        if (existingWorkOrder.status !== 'PENDING') {
            throw new Error('Cannot delete work order that is no longer pending');
        }
        return await this.workOrderRepository.delete(id);
    }
    async assignWorkOrder(id, assignedToId, assignedById) {
        // Verify that the assigned user exists and is a technician
        const assignedUser = await this.prisma.user.findUnique({
            where: { id: assignedToId },
            select: { id: true, role: true, isActive: true }
        });
        if (!assignedUser) {
            throw new Error('Assigned user not found');
        }
        if (!assignedUser.isActive) {
            throw new Error('Cannot assign to inactive user');
        }
        if (!['TECHNICIAN', 'SUPERVISOR', 'ADMIN'].includes(assignedUser.role)) {
            throw new Error('User role not authorized for work order assignment');
        }
        const updatedWorkOrder = await this.workOrderRepository.update(id, {
            assignedToId,
            status: 'IN_PROGRESS', // Automatically set to in progress when assigned
        });
        if (!updatedWorkOrder) {
            throw new Error('Failed to assign work order');
        }
        // Send notification to assigned technician
        try {
            await this.notificationService.createWorkOrderAssignmentNotification(id, assignedToId, updatedWorkOrder.title);
        }
        catch (error) {
            // Log notification error but don't fail assignment
            console.warn(`Failed to send assignment notification for work order ${id}:`, error);
        }
        return updatedWorkOrder;
    }
    async getWorkOrderStatistics(filters = {}) {
        return await this.workOrderRepository.getStatistics(filters);
    }
    async getUserWorkOrders(userId, type = 'assigned', page = 1, limit = 20) {
        const filters = type === 'created'
            ? { createdById: userId }
            : { assignedToId: userId };
        return await this.getWorkOrders(filters, page, limit);
    }
    async uploadAttachment(workOrderId, filePath, userId) {
        // Check if work order exists and user has permission
        const existingWorkOrder = await this.workOrderRepository.findById(workOrderId);
        if (!existingWorkOrder) {
            throw new Error('Work order not found');
        }
        if (!this.canUserAccessAttachment(existingWorkOrder, userId)) {
            throw new Error('Permission denied: cannot update this work order');
        }
        // Add the new file path to attachments
        const updatedAttachments = [...existingWorkOrder.attachments, filePath];
        return await this.workOrderRepository.update(workOrderId, {
            attachments: updatedAttachments,
        });
    }
    async removeAttachment(workOrderId, filePath, userId) {
        // Check if work order exists and user has permission
        const existingWorkOrder = await this.workOrderRepository.findById(workOrderId);
        if (!existingWorkOrder) {
            throw new Error('Work order not found');
        }
        if (!this.canUserAccessAttachment(existingWorkOrder, userId)) {
            throw new Error('Permission denied: cannot update this work order');
        }
        // Remove the file path from attachments
        const updatedAttachments = existingWorkOrder.attachments.filter(attachment => attachment !== filePath);
        return await this.workOrderRepository.update(workOrderId, {
            attachments: updatedAttachments,
        });
    }
    async updateWorkOrderStatus(id, statusUpdate, userId) {
        // Check if work order exists
        const existingWorkOrder = await this.workOrderRepository.findById(id);
        if (!existingWorkOrder) {
            throw new Error('Work order not found');
        }
        // Check if user has permission to update status (only assigned technician or supervisors)
        if (!(await this.canUserUpdateStatus(existingWorkOrder, userId))) {
            throw new Error('Permission denied: only assigned technician or supervisors can update work order status');
        }
        // Validate status transition
        if (!this.isValidStatusTransition(existingWorkOrder.status, statusUpdate.status)) {
            throw new Error(`Invalid status transition from ${existingWorkOrder.status} to ${statusUpdate.status}`);
        }
        const { status, notes } = statusUpdate;
        // Start transaction to update work order and create history record
        return await this.prisma.$transaction(async (tx) => {
            // Update work order status
            const updatedWorkOrder = await tx.workOrder.update({
                where: { id },
                data: {
                    status,
                    startedAt: status === 'IN_PROGRESS' && !existingWorkOrder.startedAt ? new Date() : existingWorkOrder.startedAt,
                    completedAt: status === 'COMPLETED' ? new Date() : null,
                },
                include: {
                    asset: {
                        select: {
                            id: true,
                            assetCode: true,
                            name: true,
                            location: true,
                        }
                    },
                    createdBy: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        }
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        }
                    }
                }
            });
            // Create status history record
            await tx.workOrderStatusHistory.create({
                data: {
                    workOrderId: id,
                    fromStatus: existingWorkOrder.status,
                    toStatus: status,
                    changedById: userId,
                    notes,
                }
            });
            // Send notification to supervisors about status change
            try {
                await this.notificationService.createWorkOrderStatusChangeNotification(id, existingWorkOrder.status, status, existingWorkOrder.title);
            }
            catch (error) {
                console.warn(`Failed to send status change notification for work order ${id}:`, error);
            }
            return updatedWorkOrder;
        });
    }
    async getWorkOrderWithStatusHistory(id) {
        const workOrder = await this.prisma.workOrder.findUnique({
            where: { id },
            include: {
                asset: {
                    select: {
                        id: true,
                        assetCode: true,
                        name: true,
                        location: true,
                    }
                },
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                },
                statusHistory: {
                    include: {
                        changedBy: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });
        return workOrder;
    }
    async getWorkOrderStatusHistory(id) {
        const statusHistory = await this.prisma.workOrderStatusHistory.findMany({
            where: { workOrderId: id },
            include: {
                changedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return statusHistory;
    }
    async getAssignedWorkOrders(technicianId, page = 1, limit = 20) {
        // Validate technician role
        const user = await this.prisma.user.findUnique({
            where: { id: technicianId },
            select: { role: true, isActive: true }
        });
        if (!user) {
            throw new Error('User not found');
        }
        if (!user.isActive) {
            throw new Error('User is not active');
        }
        if (!['TECHNICIAN', 'SUPERVISOR', 'ADMIN'].includes(user.role)) {
            throw new Error('User role not authorized to view assigned work orders');
        }
        return await this.getUserWorkOrders(technicianId, 'assigned', page, limit);
    }
    async completeWorkOrder(workOrderId, resolutionData, userId) {
        // Check if work order exists and user has permission
        const existingWorkOrder = await this.workOrderRepository.findById(workOrderId);
        if (!existingWorkOrder) {
            throw new Error('Work order not found');
        }
        // Verify user is assigned to this work order
        if (existingWorkOrder.assignedToId !== userId) {
            // Check if user is supervisor/admin
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { role: true }
            });
            if (!user || !['SUPERVISOR', 'ADMIN'].includes(user.role)) {
                throw new Error('Permission denied: only assigned technician or supervisors can complete work order');
            }
        }
        // Verify work order is in progress and not already completed
        if (existingWorkOrder.status === 'COMPLETED') {
            throw new Error('Work order is already completed');
        }
        if (!['IN_PROGRESS', 'WAITING_PARTS', 'WAITING_EXTERNAL'].includes(existingWorkOrder.status)) {
            throw new Error('Work order must be in progress to be completed');
        }
        // Validate required resolution data
        if (!resolutionData.solutionDescription?.trim()) {
            throw new Error('Solution description is required');
        }
        // Start transaction to complete work order, create resolution record, and maintenance history
        return await this.prisma.$transaction(async (tx) => {
            // Create resolution record
            const resolutionRecord = await tx.resolutionRecord.create({
                data: {
                    workOrderId,
                    solutionDescription: resolutionData.solutionDescription,
                    faultCode: resolutionData.faultCode,
                    resolvedById: userId,
                },
                include: {
                    resolvedBy: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        }
                    },
                    photos: true,
                }
            });
            // Create photo records if photos provided
            if (resolutionData.photos && resolutionData.photos.length > 0) {
                await tx.resolutionPhoto.createMany({
                    data: resolutionData.photos.map(photoPath => ({
                        resolutionRecordId: resolutionRecord.id,
                        filename: photoPath.split('/').pop() || 'unknown',
                        originalName: photoPath.split('/').pop() || 'unknown',
                        filePath: photoPath,
                        fileSize: 0, // Will be updated by file upload handler
                        mimeType: 'image/jpeg', // Will be updated by file upload handler
                    }))
                });
            }
            // Update work order status to COMPLETED
            const completedWorkOrder = await tx.workOrder.update({
                where: { id: workOrderId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                },
                include: {
                    asset: {
                        select: {
                            id: true,
                            assetCode: true,
                            name: true,
                            location: true,
                        }
                    },
                    createdBy: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        }
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        }
                    },
                    resolutionRecord: {
                        include: {
                            resolvedBy: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                }
                            },
                            photos: true,
                        }
                    }
                }
            });
            // Create status history record
            await tx.workOrderStatusHistory.create({
                data: {
                    workOrderId,
                    fromStatus: existingWorkOrder.status,
                    toStatus: 'COMPLETED',
                    changedById: userId,
                    notes: 'Work order completed with resolution record',
                }
            });
            // Create maintenance history record for asset
            const resolvedBy = await tx.user.findUnique({
                where: { id: userId },
                select: { firstName: true, lastName: true }
            });
            await tx.maintenanceHistory.create({
                data: {
                    assetId: existingWorkOrder.assetId,
                    workOrderId,
                    workOrderTitle: existingWorkOrder.title,
                    resolutionSummary: resolutionData.solutionDescription,
                    faultCode: resolutionData.faultCode,
                    technician: `${resolvedBy?.firstName} ${resolvedBy?.lastName}`,
                    completedAt: new Date(),
                }
            });
            // Send completion notification
            try {
                await this.notificationService.createWorkOrderStatusChangeNotification(workOrderId, existingWorkOrder.status, 'COMPLETED', existingWorkOrder.title);
            }
            catch (error) {
                console.warn(`Failed to send completion notification for work order ${workOrderId}:`, error);
            }
            return completedWorkOrder;
        });
    }
    async getWorkOrderWithResolution(workOrderId) {
        const workOrder = await this.prisma.workOrder.findUnique({
            where: { id: workOrderId },
            include: {
                asset: {
                    select: {
                        id: true,
                        assetCode: true,
                        name: true,
                        location: true,
                    }
                },
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                },
                resolutionRecord: {
                    include: {
                        resolvedBy: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            }
                        },
                        photos: true,
                    }
                }
            }
        });
        return workOrder;
    }
    async getAssetMaintenanceHistory(assetId, page = 1, limit = 20) {
        // Validate pagination parameters
        if (page < 1)
            page = 1;
        if (limit < 1 || limit > 100)
            limit = 20;
        const offset = (page - 1) * limit;
        // Get asset info
        const asset = await this.prisma.asset.findUnique({
            where: { id: assetId },
            select: {
                id: true,
                assetCode: true,
                name: true,
            }
        });
        if (!asset) {
            return null;
        }
        // Get maintenance history with pagination
        const [maintenanceHistory, totalRecords] = await Promise.all([
            this.prisma.maintenanceHistory.findMany({
                where: { assetId },
                orderBy: { completedAt: 'desc' },
                skip: offset,
                take: limit,
            }),
            this.prisma.maintenanceHistory.count({
                where: { assetId }
            })
        ]);
        return {
            assetId: asset.id,
            assetCode: asset.assetCode,
            assetName: asset.name,
            maintenanceHistory,
            totalRecords,
        };
    }
    async uploadResolutionPhotos(workOrderId, photoPaths, userId) {
        // Check if work order exists and has resolution record
        const workOrder = await this.prisma.workOrder.findUnique({
            where: { id: workOrderId },
            include: {
                resolutionRecord: {
                    include: {
                        resolvedBy: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            }
                        },
                        photos: true,
                    }
                }
            }
        });
        if (!workOrder) {
            throw new Error('Work order not found');
        }
        if (!workOrder.resolutionRecord) {
            throw new Error('Work order does not have a resolution record yet');
        }
        // Verify user has permission (resolved by user or supervisor/admin)
        if (workOrder.resolutionRecord.resolvedById !== userId) {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { role: true }
            });
            if (!user || !['SUPERVISOR', 'ADMIN'].includes(user.role)) {
                throw new Error('Permission denied: only the resolver or supervisors can upload photos');
            }
        }
        // Add photos to resolution record
        await this.prisma.resolutionPhoto.createMany({
            data: photoPaths.map(photoPath => ({
                resolutionRecordId: workOrder.resolutionRecord.id,
                filename: photoPath.split('/').pop() || 'unknown',
                originalName: photoPath.split('/').pop() || 'unknown',
                filePath: photoPath,
                fileSize: 0, // Will be updated by file upload handler
                mimeType: 'image/jpeg', // Will be updated by file upload handler
            }))
        });
        // Return updated resolution record
        const updatedResolution = await this.prisma.resolutionRecord.findUnique({
            where: { id: workOrder.resolutionRecord.id },
            include: {
                resolvedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                },
                photos: true,
            }
        });
        return updatedResolution;
    }
    // Helper methods for permission and validation logic
    canUserUpdateWorkOrder(workOrder, userId) {
        return workOrder.createdById === userId || workOrder.assignedToId === userId;
    }
    applyUpdatePermissions(workOrder, data, userId) {
        // Creator can update all fields
        if (workOrder.createdById === userId) {
            return data;
        }
        // Assigned technician can only update status, solution, and fault code
        const allowedUpdates = {};
        if (data.status !== undefined)
            allowedUpdates.status = data.status;
        if (data.solution !== undefined)
            allowedUpdates.solution = data.solution;
        if (data.faultCode !== undefined)
            allowedUpdates.faultCode = data.faultCode;
        return allowedUpdates;
    }
    canUserAccessAttachment(workOrder, userId) {
        return this.canUserUpdateWorkOrder(workOrder, userId);
    }
    async canUserUpdateStatus(workOrder, userId) {
        // Check if user is assigned to the work order
        if (workOrder.assignedToId === userId) {
            return true;
        }
        // Check if user is a supervisor or admin
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
        return user?.role === 'SUPERVISOR' || user?.role === 'ADMIN';
    }
    isValidStatusTransition(fromStatus, toStatus) {
        // Define valid status transitions
        const validTransitions = {
            'PENDING': ['IN_PROGRESS', 'CANCELLED'],
            'IN_PROGRESS': ['WAITING_PARTS', 'WAITING_EXTERNAL', 'COMPLETED', 'CANCELLED'],
            'WAITING_PARTS': ['IN_PROGRESS', 'CANCELLED'],
            'WAITING_EXTERNAL': ['IN_PROGRESS', 'CANCELLED'],
            'COMPLETED': [], // Cannot transition from completed
            'CANCELLED': [], // Cannot transition from cancelled
        };
        return validTransitions[fromStatus]?.includes(toStatus) || false;
    }
}
exports.WorkOrderService = WorkOrderService;
