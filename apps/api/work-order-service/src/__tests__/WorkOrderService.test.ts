import { PrismaClient } from '@emaintenance/database';
import { WorkOrderService } from '../services/WorkOrderService';
import { WorkOrderRepository } from '../repositories/WorkOrderRepository';

// Mock Prisma
jest.mock('@emaintenance/database');
jest.mock('../repositories/WorkOrderRepository');

describe('WorkOrderService', () => {
  let workOrderService: WorkOrderService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockRepository: jest.Mocked<WorkOrderRepository>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    mockRepository = new WorkOrderRepository(mockPrisma) as jest.Mocked<WorkOrderRepository>;
    workOrderService = new WorkOrderService(mockPrisma);
    
    // Mock Prisma methods used in the new functionality
    mockPrisma.$transaction = jest.fn();
    mockPrisma.workOrderStatusHistory = {
      findMany: jest.fn(),
      create: jest.fn(),
    } as any;
    mockPrisma.user = {
      findUnique: jest.fn(),
    } as any;
    mockPrisma.asset = {
      findUnique: jest.fn(),
    } as any;
    mockPrisma.workOrder = {
      findUnique: jest.fn(),
    } as any;
    mockPrisma.resolutionRecord = {
      findUnique: jest.fn(),
    } as any;
    mockPrisma.resolutionPhoto = {
      createMany: jest.fn(),
    } as any;
    mockPrisma.maintenanceHistory = {
      findMany: jest.fn(),
      count: jest.fn(),
    } as any;
    
    // Replace the repository instance
    (workOrderService as any).workOrderRepository = mockRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorkOrder', () => {
    it('should create work order successfully', async () => {
      const createData = {
        title: 'Test Work Order',
        description: 'Test Description',
        category: '电气设备',
        reason: '设备故障',
        priority: 'MEDIUM' as any,
        assetId: 'asset-1',
      };

      const mockAsset = {
        id: 'asset-1',
        isActive: true,
        location: 'Test Location',
      };

      const mockWorkOrder = {
        id: 'wo-1',
        ...createData,
        location: 'Test Location',
        createdById: 'user-1',
        asset: { id: 'asset-1', assetCode: 'TEST001', name: 'Test Asset', location: 'Test Location' },
        createdBy: { id: 'user-1', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
        assignedTo: null,
      };

      (mockPrisma.asset.findUnique as jest.Mock).mockResolvedValue(mockAsset);
      mockRepository.create.mockResolvedValue(mockWorkOrder as any);

      const result = await workOrderService.createWorkOrder(createData, 'user-1');

      expect(result).toEqual(mockWorkOrder);
      expect(mockPrisma.asset.findUnique).toHaveBeenCalledWith({
        where: { id: 'asset-1' },
        select: { id: true, isActive: true, location: true }
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createData,
        location: 'Test Location',
        createdById: 'user-1',
      });
    });

    it('should throw error if asset not found', async () => {
      const createData = {
        title: 'Test Work Order',
        description: 'Test Description',
        category: '电气设备',
        reason: '设备故障',
        priority: 'MEDIUM' as any,
        assetId: 'non-existent',
      };

      (mockPrisma.asset.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(workOrderService.createWorkOrder(createData, 'user-1'))
        .rejects.toThrow('Asset not found');
    });

    it('should throw error if asset is inactive', async () => {
      const createData = {
        title: 'Test Work Order',
        description: 'Test Description',
        category: '电气设备',
        reason: '设备故障',
        priority: 'MEDIUM' as any,
        assetId: 'asset-1',
      };

      const mockAsset = {
        id: 'asset-1',
        isActive: false,
        location: 'Test Location',
      };

      (mockPrisma.asset.findUnique as jest.Mock).mockResolvedValue(mockAsset);

      await expect(workOrderService.createWorkOrder(createData, 'user-1'))
        .rejects.toThrow('Cannot create work order for inactive asset');
    });
  });

  describe('getWorkOrderById', () => {
    it('should return work order by id', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        title: 'Test Work Order',
      };

      mockRepository.findById.mockResolvedValue(mockWorkOrder as any);

      const result = await workOrderService.getWorkOrderById('wo-1');

      expect(result).toEqual(mockWorkOrder);
      expect(mockRepository.findById).toHaveBeenCalledWith('wo-1');
    });

    it('should return null if work order not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await workOrderService.getWorkOrderById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateWorkOrder', () => {
    it('should update work order successfully', async () => {
      const mockExistingWorkOrder = {
        id: 'wo-1',
        createdById: 'user-1',
        assignedToId: null,
      };

      const mockUpdatedWorkOrder = {
        ...mockExistingWorkOrder,
        title: 'Updated Title',
      };

      const updateData = {
        title: 'Updated Title',
      };

      mockRepository.findById.mockResolvedValue(mockExistingWorkOrder as any);
      mockRepository.update.mockResolvedValue(mockUpdatedWorkOrder as any);

      const result = await workOrderService.updateWorkOrder('wo-1', updateData, 'user-1');

      expect(result).toEqual(mockUpdatedWorkOrder);
      expect(mockRepository.update).toHaveBeenCalledWith('wo-1', updateData);
    });

    it('should throw error if work order not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(workOrderService.updateWorkOrder('non-existent', {}, 'user-1'))
        .rejects.toThrow('Work order not found');
    });

    it('should throw error if user has no permission', async () => {
      const mockExistingWorkOrder = {
        id: 'wo-1',
        createdById: 'other-user',
        assignedToId: null,
      };

      mockRepository.findById.mockResolvedValue(mockExistingWorkOrder as any);

      await expect(workOrderService.updateWorkOrder('wo-1', {}, 'user-1'))
        .rejects.toThrow('Permission denied: cannot update this work order');
    });
  });

  describe('assignWorkOrder', () => {
    it('should assign work order successfully', async () => {
      const mockUser = {
        id: 'tech-1',
        role: 'TECHNICIAN',
        isActive: true,
      };

      const mockUpdatedWorkOrder = {
        id: 'wo-1',
        assignedToId: 'tech-1',
        status: 'IN_PROGRESS',
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockRepository.update.mockResolvedValue(mockUpdatedWorkOrder as any);

      const result = await workOrderService.assignWorkOrder('wo-1', 'tech-1', 'supervisor-1');

      expect(result).toEqual(mockUpdatedWorkOrder);
      expect(mockRepository.update).toHaveBeenCalledWith('wo-1', {
        assignedToId: 'tech-1',
        status: 'IN_PROGRESS',
      });
    });

    it('should throw error if assigned user not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(workOrderService.assignWorkOrder('wo-1', 'non-existent', 'supervisor-1'))
        .rejects.toThrow('Assigned user not found');
    });

    it('should throw error if user role not authorized', async () => {
      const mockUser = {
        id: 'user-1',
        role: 'EMPLOYEE',
        isActive: true,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(workOrderService.assignWorkOrder('wo-1', 'user-1', 'supervisor-1'))
        .rejects.toThrow('User role not authorized for work order assignment');
    });
  });

  describe('updateWorkOrderStatus', () => {
    it('should update work order status successfully', async () => {
      const mockExistingWorkOrder = {
        id: 'wo-1',
        status: 'PENDING',
        assignedToId: 'tech-1',
        title: 'Test Work Order',
      };

      const mockUpdatedWorkOrder = {
        ...mockExistingWorkOrder,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      };

      const statusUpdate = {
        status: 'IN_PROGRESS' as any,
        notes: 'Starting work on this issue',
      };

      mockRepository.findById.mockResolvedValue(mockExistingWorkOrder as any);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: 'TECHNICIAN',
      });
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback({
          workOrder: {
            update: jest.fn().mockResolvedValue(mockUpdatedWorkOrder),
          },
          workOrderStatusHistory: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await workOrderService.updateWorkOrderStatus('wo-1', statusUpdate, 'tech-1');

      expect(result).toEqual(mockUpdatedWorkOrder);
    });

    it('should throw error if work order not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(workOrderService.updateWorkOrderStatus('wo-1', { status: 'IN_PROGRESS' as any }, 'tech-1'))
        .rejects.toThrow('Work order not found');
    });

    it('should throw error if user not authorized to update status', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        assignedToId: 'tech-1',
        status: 'PENDING',
      };

      mockRepository.findById.mockResolvedValue(mockWorkOrder as any);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: 'EMPLOYEE',
      });

      await expect(workOrderService.updateWorkOrderStatus('wo-1', { status: 'IN_PROGRESS' as any }, 'other-user'))
        .rejects.toThrow('Permission denied: only assigned technician or supervisors can update work order status');
    });

    it('should throw error for invalid status transition', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        assignedToId: 'tech-1',
        status: 'COMPLETED',
      };

      mockRepository.findById.mockResolvedValue(mockWorkOrder as any);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: 'TECHNICIAN',
      });

      await expect(workOrderService.updateWorkOrderStatus('wo-1', { status: 'PENDING' as any }, 'tech-1'))
        .rejects.toThrow('Invalid status transition from COMPLETED to PENDING');
    });
  });

  describe('getAssignedWorkOrders', () => {
    it('should return assigned work orders for technician', async () => {
      const mockUser = {
        role: 'TECHNICIAN',
        isActive: true,
      };

      const mockWorkOrders = {
        workOrders: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      jest.spyOn(workOrderService, 'getUserWorkOrders').mockResolvedValue(mockWorkOrders);

      const result = await workOrderService.getAssignedWorkOrders('tech-1');

      expect(result).toEqual(mockWorkOrders);
      expect(workOrderService.getUserWorkOrders).toHaveBeenCalledWith('tech-1', 'assigned', 1, 20);
    });

    it('should throw error if user not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(workOrderService.getAssignedWorkOrders('non-existent'))
        .rejects.toThrow('User not found');
    });

    it('should throw error if user role not authorized', async () => {
      const mockUser = {
        role: 'EMPLOYEE',
        isActive: true,
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(workOrderService.getAssignedWorkOrders('user-1'))
        .rejects.toThrow('User role not authorized to view assigned work orders');
    });
  });

  describe('getWorkOrderStatusHistory', () => {
    it('should return status history for work order', async () => {
      const mockStatusHistory = [
        {
          id: 'history-1',
          workOrderId: 'wo-1',
          fromStatus: null,
          toStatus: 'PENDING',
          changedById: 'user-1',
          changedBy: { id: 'user-1', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
          notes: null,
          createdAt: new Date(),
        },
        {
          id: 'history-2',
          workOrderId: 'wo-1',
          fromStatus: 'PENDING',
          toStatus: 'IN_PROGRESS',
          changedById: 'tech-1',
          changedBy: { id: 'tech-1', firstName: 'Tech', lastName: 'User', email: 'tech@example.com' },
          notes: 'Starting work',
          createdAt: new Date(),
        },
      ];

      (mockPrisma.workOrderStatusHistory.findMany as jest.Mock).mockResolvedValue(mockStatusHistory);

      const result = await workOrderService.getWorkOrderStatusHistory('wo-1');

      expect(result).toEqual(mockStatusHistory);
      expect(mockPrisma.workOrderStatusHistory.findMany).toHaveBeenCalledWith({
        where: { workOrderId: 'wo-1' },
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
    });
  });

  describe('completeWorkOrder', () => {
    it('should complete work order successfully', async () => {
      const workOrderId = 'work-order-1';
      const userId = 'user-1';
      const resolutionData = {
        solutionDescription: 'Fixed the electrical issue',
        faultCode: 'ELECTRICAL_FAILURE' as any,
        photos: ['photo1.jpg', 'photo2.jpg'],
      };

      const mockWorkOrder = {
        id: workOrderId,
        title: 'Test Work Order',
        status: 'IN_PROGRESS',
        assignedToId: userId,
        assetId: 'asset-1',
      };

      const mockUser = {
        id: userId,
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockResolutionRecord = {
        id: 'resolution-1',
        workOrderId,
        solutionDescription: resolutionData.solutionDescription,
        faultCode: resolutionData.faultCode,
        resolvedById: userId,
        resolvedBy: mockUser,
        photos: [],
      };

      const mockCompletedWorkOrder = {
        ...mockWorkOrder,
        status: 'COMPLETED',
        completedAt: new Date(),
        resolutionRecord: mockResolutionRecord,
      };

      mockRepository.findById.mockResolvedValue(mockWorkOrder as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          resolutionRecord: {
            create: jest.fn().mockResolvedValue(mockResolutionRecord),
          },
          resolutionPhoto: {
            createMany: jest.fn().mockResolvedValue({}),
          },
          workOrder: {
            update: jest.fn().mockResolvedValue(mockCompletedWorkOrder),
          },
          workOrderStatusHistory: {
            create: jest.fn().mockResolvedValue({}),
          },
          maintenanceHistory: {
            create: jest.fn().mockResolvedValue({}),
          },
          user: {
            findUnique: jest.fn().mockResolvedValue(mockUser),
          },
        };
        return await callback(tx as any);
      });

      const result = await workOrderService.completeWorkOrder(workOrderId, resolutionData, userId);

      expect(mockRepository.findById).toHaveBeenCalledWith(workOrderId);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(mockCompletedWorkOrder);
    });

    it('should throw error if work order not found', async () => {
      const workOrderId = 'non-existent';
      const userId = 'user-1';
      const resolutionData = {
        solutionDescription: 'Fixed the issue',
      };

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        workOrderService.completeWorkOrder(workOrderId, resolutionData, userId)
      ).rejects.toThrow('Work order not found');
    });

    it('should throw error if user is not assigned to work order', async () => {
      const workOrderId = 'work-order-1';
      const userId = 'user-1';
      const resolutionData = {
        solutionDescription: 'Fixed the issue',
      };

      const mockWorkOrder = {
        id: workOrderId,
        status: 'IN_PROGRESS',
        assignedToId: 'different-user',
      };

      mockRepository.findById.mockResolvedValue(mockWorkOrder as any);
      mockPrisma.user.findUnique.mockResolvedValue({ role: 'TECHNICIAN' } as any);

      await expect(
        workOrderService.completeWorkOrder(workOrderId, resolutionData, userId)
      ).rejects.toThrow('Permission denied: only assigned technician or supervisors can complete work order');
    });

    it('should throw error if work order is already completed', async () => {
      const workOrderId = 'work-order-1';
      const userId = 'user-1';
      const resolutionData = {
        solutionDescription: 'Fixed the issue',
      };

      const mockWorkOrder = {
        id: workOrderId,
        status: 'COMPLETED',
        assignedToId: userId,
      };

      mockRepository.findById.mockResolvedValue(mockWorkOrder as any);

      await expect(
        workOrderService.completeWorkOrder(workOrderId, resolutionData, userId)
      ).rejects.toThrow('Work order is already completed');
    });

    it('should allow supervisor to complete work order', async () => {
      const workOrderId = 'work-order-1';
      const userId = 'supervisor-1';
      const resolutionData = {
        solutionDescription: 'Fixed the issue',
      };

      const mockWorkOrder = {
        id: workOrderId,
        status: 'IN_PROGRESS',
        assignedToId: 'technician-1',
        assetId: 'asset-1',
        title: 'Test Work Order',
      };

      const mockUser = {
        id: userId,
        role: 'SUPERVISOR',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockRepository.findById.mockResolvedValue(mockWorkOrder as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          resolutionRecord: { create: jest.fn().mockResolvedValue({}) },
          resolutionPhoto: { createMany: jest.fn().mockResolvedValue({}) },
          workOrder: { update: jest.fn().mockResolvedValue({ ...mockWorkOrder, status: 'COMPLETED' }) },
          workOrderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
          maintenanceHistory: { create: jest.fn().mockResolvedValue({}) },
          user: { findUnique: jest.fn().mockResolvedValue(mockUser) },
        };
        return await callback(tx as any);
      });

      await expect(
        workOrderService.completeWorkOrder(workOrderId, resolutionData, userId)
      ).resolves.not.toThrow();
    });
  });

  describe('getAssetMaintenanceHistory', () => {
    it('should get asset maintenance history successfully', async () => {
      const assetId = 'asset-1';
      const page = 1;
      const limit = 20;

      const mockAsset = {
        id: assetId,
        assetCode: 'A001',
        name: 'Test Asset',
      };

      const mockMaintenanceHistory = [
        {
          id: 'history-1',
          workOrderTitle: 'Test Work Order',
          technician: 'John Doe',
          completedAt: new Date(),
        },
      ];

      mockPrisma.asset.findUnique.mockResolvedValue(mockAsset as any);
      mockPrisma.maintenanceHistory.findMany.mockResolvedValue(mockMaintenanceHistory as any);
      mockPrisma.maintenanceHistory.count.mockResolvedValue(1);

      const result = await workOrderService.getAssetMaintenanceHistory(assetId, page, limit);

      expect(result).toEqual({
        assetId: mockAsset.id,
        assetCode: mockAsset.assetCode,
        assetName: mockAsset.name,
        maintenanceHistory: mockMaintenanceHistory,
        totalRecords: 1,
      });
    });

    it('should return null if asset not found', async () => {
      const assetId = 'non-existent';

      mockPrisma.asset.findUnique.mockResolvedValue(null);

      const result = await workOrderService.getAssetMaintenanceHistory(assetId);

      expect(result).toBeNull();
    });
  });

  describe('uploadResolutionPhotos', () => {
    it('should upload resolution photos successfully', async () => {
      const workOrderId = 'work-order-1';
      const userId = 'user-1';
      const photoPaths = ['photo1.jpg', 'photo2.jpg'];

      const mockWorkOrder = {
        id: workOrderId,
        resolutionRecord: {
          id: 'resolution-1',
          resolvedById: userId,
          resolvedBy: { id: userId, firstName: 'John', lastName: 'Doe' },
          photos: [],
        },
      };

      const mockUpdatedResolution = {
        ...mockWorkOrder.resolutionRecord,
        photos: [
          { id: 'photo-1', filename: 'photo1.jpg', filePath: 'photo1.jpg' },
          { id: 'photo-2', filename: 'photo2.jpg', filePath: 'photo2.jpg' },
        ],
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder as any);
      mockPrisma.resolutionPhoto.createMany.mockResolvedValue({} as any);
      mockPrisma.resolutionRecord.findUnique.mockResolvedValue(mockUpdatedResolution as any);

      const result = await workOrderService.uploadResolutionPhotos(workOrderId, photoPaths, userId);

      expect(mockPrisma.resolutionPhoto.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            resolutionRecordId: 'resolution-1',
            filename: 'photo1.jpg',
            filePath: 'photo1.jpg',
          }),
        ]),
      });
      expect(result).toEqual(mockUpdatedResolution);
    });

    it('should throw error if work order has no resolution record', async () => {
      const workOrderId = 'work-order-1';
      const userId = 'user-1';
      const photoPaths = ['photo1.jpg'];

      const mockWorkOrder = {
        id: workOrderId,
        resolutionRecord: null,
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder as any);

      await expect(
        workOrderService.uploadResolutionPhotos(workOrderId, photoPaths, userId)
      ).rejects.toThrow('Work order does not have a resolution record yet');
    });
  });
});