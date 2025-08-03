import { PrismaClient } from '@emaintanance/database';
import { WorkOrderService } from '../services/WorkOrderService';
import { WorkOrderRepository } from '../repositories/WorkOrderRepository';

// Mock Prisma
jest.mock('@emaintanance/database');
jest.mock('../repositories/WorkOrderRepository');

describe('WorkOrderService', () => {
  let workOrderService: WorkOrderService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockRepository: jest.Mocked<WorkOrderRepository>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    mockRepository = new WorkOrderRepository(mockPrisma) as jest.Mocked<WorkOrderRepository>;
    workOrderService = new WorkOrderService(mockPrisma);
    
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
});