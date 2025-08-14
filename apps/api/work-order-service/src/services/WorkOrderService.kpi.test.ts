import { PrismaClient } from '@emaintenance/database';
import { WorkOrderService } from './WorkOrderService';

// Mock Prisma
jest.mock('@emaintenance/database');

const mockPrisma = {
  workOrder: {
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as PrismaClient;

describe('WorkOrderService KPI Methods', () => {
  let workOrderService: WorkOrderService;

  beforeEach(() => {
    workOrderService = new WorkOrderService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('getMTTRStatistics', () => {
    beforeEach(() => {
      // Mock completed work orders data
      const mockCompletedWorkOrders = [
        {
          reportedAt: new Date('2024-01-01T08:00:00Z'),
          completedAt: new Date('2024-01-01T12:00:00Z'), // 4 hours
          priority: 'HIGH',
          category: 'Electrical',
        },
        {
          reportedAt: new Date('2024-01-02T09:00:00Z'),
          completedAt: new Date('2024-01-02T17:00:00Z'), // 8 hours
          priority: 'MEDIUM',
          category: 'Mechanical',
        },
        {
          reportedAt: new Date('2024-01-03T10:00:00Z'),
          completedAt: new Date('2024-01-03T14:00:00Z'), // 4 hours
          priority: 'HIGH',
          category: 'Electrical',
        },
      ];

      (mockPrisma.workOrder.findMany as jest.Mock).mockResolvedValue(mockCompletedWorkOrders);
    });

    it('should calculate average MTTR correctly', async () => {
      const result = await workOrderService.getMTTRStatistics();

      expect(result.averageMTTR).toBe(5.333333333333333); // (4 + 8 + 4) / 3 hours
    });

    it('should calculate MTTR by priority correctly', async () => {
      const result = await workOrderService.getMTTRStatistics();

      expect(result.byPriority).toEqual([
        { priority: 'HIGH', mttr: 4 }, // (4 + 4) / 2
        { priority: 'MEDIUM', mttr: 8 }, // 8 / 1
      ]);
    });

    it('should calculate MTTR by category correctly', async () => {
      const result = await workOrderService.getMTTRStatistics();

      expect(result.byCategory).toEqual([
        { category: 'Electrical', mttr: 4 }, // (4 + 4) / 2
        { category: 'Mechanical', mttr: 8 }, // 8 / 1
      ]);
    });

    it('should return empty data when no completed work orders exist', async () => {
      (mockPrisma.workOrder.findMany as jest.Mock).mockResolvedValue([]);

      const result = await workOrderService.getMTTRStatistics();

      expect(result).toEqual({
        averageMTTR: 0,
        mttrTrend: [],
        byPriority: [],
        byCategory: [],
      });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        timeRange: 'week',
        granularity: 'day',
      };

      await workOrderService.getMTTRStatistics(filters);

      expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith({
        where: {
          reportedAt: {
            gte: expect.any(Date),
          },
          status: 'COMPLETED',
          completedAt: { not: null },
        },
        select: {
          reportedAt: true,
          completedAt: true,
          priority: true,
          category: true,
        },
      });
    });
  });

  describe('getWorkOrderTrends', () => {
    beforeEach(() => {
      const mockCreatedWorkOrders = [
        { reportedAt: new Date('2024-01-01T08:00:00Z') },
        { reportedAt: new Date('2024-01-01T10:00:00Z') },
        { reportedAt: new Date('2024-01-02T09:00:00Z') },
      ];

      const mockCompletedWorkOrders = [
        {
          completedAt: new Date('2024-01-01T12:00:00Z'),
          reportedAt: new Date('2024-01-01T08:00:00Z'),
        },
        {
          completedAt: new Date('2024-01-02T17:00:00Z'),
          reportedAt: new Date('2024-01-02T09:00:00Z'),
        },
      ];

      (mockPrisma.workOrder.findMany as jest.Mock)
        .mockResolvedValueOnce(mockCreatedWorkOrders) // First call for creation trend
        .mockResolvedValueOnce(mockCompletedWorkOrders); // Second call for completion trend
    });

    it('should calculate creation and completion trends', async () => {
      const result = await workOrderService.getWorkOrderTrends({ granularity: 'day' });

      expect(result.creationTrend).toEqual([
        { date: '2024-01-01', count: 2 },
        { date: '2024-01-02', count: 1 },
      ]);

      expect(result.completionTrend).toEqual([
        { date: '2024-01-01', count: 1 },
        { date: '2024-01-02', count: 1 },
      ]);
    });

    it('should calculate average resolution time trend', async () => {
      const result = await workOrderService.getWorkOrderTrends({ granularity: 'day' });

      expect(result.averageResolutionTime).toEqual([
        { date: '2024-01-01', hours: 4 }, // 4 hours resolution time
        { date: '2024-01-02', hours: 8 }, // 8 hours resolution time
      ]);
    });
  });

  describe('buildKPIWhereClause', () => {
    it('should build where clause with time range filter', () => {
      const service = workOrderService as any;
      const filters = { timeRange: 'week' };
      
      const result = service.buildKPIWhereClause(filters);

      expect(result.reportedAt.gte).toBeInstanceOf(Date);
    });

    it('should build where clause with date range filter', () => {
      const service = workOrderService as any;
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const filters = { startDate, endDate };
      
      const result = service.buildKPIWhereClause(filters);

      expect(result.reportedAt.gte).toBe(startDate);
      expect(result.reportedAt.lte).toBe(endDate);
    });

    it('should build where clause with other filters', () => {
      const service = workOrderService as any;
      const filters = {
        status: 'COMPLETED',
        priority: 'HIGH',
        category: 'Electrical',
      };
      
      const result = service.buildKPIWhereClause(filters);

      expect(result.status).toBe('COMPLETED');
      expect(result.priority).toBe('HIGH');
      expect(result.category).toBe('Electrical');
    });
  });

  describe('helper methods', () => {
    it('should group data by key correctly', () => {
      const service = workOrderService as any;
      const data = [
        { priority: 'HIGH', value: 1 },
        { priority: 'MEDIUM', value: 2 },
        { priority: 'HIGH', value: 3 },
      ];

      const result = service.groupBy(data, 'priority');

      expect(result).toEqual({
        HIGH: [
          { priority: 'HIGH', value: 1 },
          { priority: 'HIGH', value: 3 },
        ],
        MEDIUM: [
          { priority: 'MEDIUM', value: 2 },
        ],
      });
    });

    it('should get period key for different granularities', () => {
      const service = workOrderService as any;
      const date = new Date('2024-01-15T10:30:00Z');

      expect(service.getPeriodKey(date, 'day')).toBe('2024-01-15');
      expect(service.getPeriodKey(date, 'month')).toBe('2024-01');
      
      // Week should return the Monday of that week
      const weekKey = service.getPeriodKey(date, 'week');
      expect(weekKey).toMatch(/2024-01-\d{2}/);
    });
  });
});