import { PrismaClient, UserRole } from '@emaintenance/database';
import { AssignmentRuleService } from '../services/AssignmentRuleService';
import { CreateAssignmentRuleRequest, UpdateAssignmentRuleRequest } from '../types/assignment-rule';

// Mock the repository
jest.mock('../repositories/AssignmentRuleRepository');

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  assignmentRule: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
} as any as PrismaClient;

describe('AssignmentRuleService', () => {
  let service: AssignmentRuleService;
  const supervisorId = 'supervisor-id';
  const technicianId = 'technician-id';

  beforeEach(() => {
    service = new AssignmentRuleService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('createRule', () => {
    const validRuleData: CreateAssignmentRuleRequest = {
      name: 'Test Rule',
      priority: 5,
      isActive: true,
      assetTypes: ['电气'],
      categories: ['故障'],
      locations: ['车间A'],
      priorities: ['HIGH'],
      assignToId: technicianId,
    };

    beforeEach(() => {
      // Mock supervisor user
      mockPrisma.user.findUnique.mockImplementation((query) => {
        if (query.where.id === supervisorId) {
          return Promise.resolve({ role: UserRole.SUPERVISOR, isActive: true });
        }
        if (query.where.id === technicianId) {
          return Promise.resolve({ role: UserRole.TECHNICIAN, isActive: true });
        }
        return Promise.resolve(null);
      });
    });

    it('should create rule successfully with valid data', async () => {
      const mockCreatedRule = {
        id: 'rule-id',
        ...validRuleData,
        assignTo: {
          id: technicianId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.assignmentRule.create.mockResolvedValue(mockCreatedRule);

      const result = await service.createRule(validRuleData, supervisorId);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: supervisorId },
        select: { role: true, isActive: true },
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: technicianId },
        select: { role: true, isActive: true },
      });
      expect(mockPrisma.assignmentRule.create).toHaveBeenCalledWith({
        data: validRuleData,
        include: expect.any(Object),
      });
      expect(result).toEqual({
        id: 'rule-id',
        name: 'Test Rule',
        priority: 5,
        isActive: true,
        assetTypes: ['电气'],
        categories: ['故障'],
        locations: ['车间A'],
        priorities: ['HIGH'],
        assignToId: technicianId,
        assignTo: {
          id: technicianId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
        },
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error if user is not supervisor', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: UserRole.EMPLOYEE, isActive: true });

      await expect(service.createRule(validRuleData, 'employee-id')).rejects.toThrow(
        'Access denied: create assignment rules requires supervisor or admin role'
      );
    });

    it('should throw error if assigned technician does not exist', async () => {
      mockPrisma.user.findUnique.mockImplementation((query) => {
        if (query.where.id === supervisorId) {
          return Promise.resolve({ role: UserRole.SUPERVISOR, isActive: true });
        }
        return Promise.resolve(null);
      });

      await expect(service.createRule(validRuleData, supervisorId)).rejects.toThrow(
        'Assigned technician not found or inactive'
      );
    });

    it('should throw error if assigned user is not a technician', async () => {
      mockPrisma.user.findUnique.mockImplementation((query) => {
        if (query.where.id === supervisorId) {
          return Promise.resolve({ role: UserRole.SUPERVISOR, isActive: true });
        }
        if (query.where.id === technicianId) {
          return Promise.resolve({ role: UserRole.EMPLOYEE, isActive: true });
        }
        return Promise.resolve(null);
      });

      await expect(service.createRule(validRuleData, supervisorId)).rejects.toThrow(
        'Assigned user must have technician role'
      );
    });
  });

  describe('findMatchingRule', () => {
    const mockRules = [
      {
        id: 'rule-1',
        name: 'High Priority Rule',
        priority: 10,
        isActive: true,
        assetTypes: [],
        categories: ['电气'],
        locations: ['车间A'],
        priorities: ['HIGH', 'URGENT'],
        assignToId: 'tech-1',
        assignTo: { id: 'tech-1', firstName: 'Tech', lastName: 'One', email: 'tech1@example.com' },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'rule-2',
        name: 'Medium Priority Rule',
        priority: 5,
        isActive: true,
        assetTypes: [],
        categories: ['机械'],
        locations: [],
        priorities: ['MEDIUM'],
        assignToId: 'tech-2',
        assignTo: { id: 'tech-2', firstName: 'Tech', lastName: 'Two', email: 'tech2@example.com' },
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
    ];

    beforeEach(() => {
      mockPrisma.assignmentRule.findMany.mockResolvedValue(mockRules);
      
      // Mock the repository method directly on the service instance
      const mockRepository = {
        findActiveRulesByPriority: jest.fn().mockResolvedValue(mockRules),
      };
      (service as any).assignmentRuleRepository = mockRepository;
    });

    it('should find matching rule based on category and priority', async () => {
      const result = await service.findMatchingRule({
        category: '电气',
        location: '车间A',
        priority: 'HIGH',
      });

      expect(result).toEqual({
        ruleId: 'rule-1',
        ruleName: 'High Priority Rule',
        priority: 10,
        assignToId: 'tech-1',
      });
    });

    it('should return highest priority rule when multiple matches', async () => {
      const mockMultipleRules = [
        { ...mockRules[0], priority: 5 },
        { ...mockRules[1], categories: ['电气'], priority: 10 },
      ];
      mockPrisma.assignmentRule.findMany.mockResolvedValue(mockMultipleRules);

      const result = await service.findMatchingRule({
        category: '电气',
        priority: 'MEDIUM',
      });

      expect(result?.priority).toBe(10);
      expect(result?.assignToId).toBe('tech-2');
    });

    it('should return null if no rules match', async () => {
      const result = await service.findMatchingRule({
        category: '不存在的类别',
        priority: 'LOW',
      });

      expect(result).toBeNull();
    });

    it('should match partial location names', async () => {
      const result = await service.findMatchingRule({
        category: '电气',
        location: '车间A-1号设备',
        priority: 'HIGH',
      });

      expect(result).toBeTruthy();
      expect(result?.ruleId).toBe('rule-1');
    });
  });

  describe('updateRule', () => {
    const ruleId = 'rule-id';
    const updateData: UpdateAssignmentRuleRequest = {
      name: 'Updated Rule',
      priority: 8,
    };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: UserRole.SUPERVISOR, isActive: true });
    });

    it('should update rule successfully', async () => {
      const mockUpdatedRule = {
        id: ruleId,
        name: 'Updated Rule',
        priority: 8,
        isActive: true,
        assetTypes: [],
        categories: ['电气'],
        locations: [],
        priorities: ['HIGH'],
        assignToId: technicianId,
        assignTo: {
          id: technicianId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.assignmentRule.update.mockResolvedValue(mockUpdatedRule);

      const result = await service.updateRule(ruleId, updateData, supervisorId);

      expect(mockPrisma.assignmentRule.update).toHaveBeenCalledWith({
        where: { id: ruleId },
        data: updateData,
        include: expect.any(Object),
      });
      expect(result?.name).toBe('Updated Rule');
      expect(result?.priority).toBe(8);
    });

    it('should verify technician when assignToId is updated', async () => {
      const updateWithAssignment = { ...updateData, assignToId: 'new-tech-id' };
      
      mockPrisma.user.findUnique.mockImplementation((query) => {
        if (query.where.id === supervisorId) {
          return Promise.resolve({ role: UserRole.SUPERVISOR, isActive: true });
        }
        if (query.where.id === 'new-tech-id') {
          return Promise.resolve({ role: UserRole.TECHNICIAN, isActive: true });
        }
        return Promise.resolve(null);
      });

      mockPrisma.assignmentRule.update.mockResolvedValue({
        id: ruleId,
        assignToId: 'new-tech-id',
        assignTo: { id: 'new-tech-id', firstName: 'New', lastName: 'Tech', email: 'new@example.com' },
      } as any);

      await service.updateRule(ruleId, updateWithAssignment, supervisorId);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'new-tech-id' },
        select: { role: true, isActive: true },
      });
    });
  });

  describe('deleteRule', () => {
    const ruleId = 'rule-id';

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: UserRole.SUPERVISOR, isActive: true });
    });

    it('should delete rule successfully', async () => {
      mockPrisma.assignmentRule.delete.mockResolvedValue({});

      const result = await service.deleteRule(ruleId, supervisorId);

      expect(mockPrisma.assignmentRule.delete).toHaveBeenCalledWith({
        where: { id: ruleId },
      });
      expect(result).toBe(true);
    });

    it('should return false if delete fails', async () => {
      mockPrisma.assignmentRule.delete.mockRejectedValue(new Error('Not found'));

      const result = await service.deleteRule(ruleId, supervisorId);

      expect(result).toBe(false);
    });
  });
});