import { PrismaClient } from '@emaintanance/database';
import { AssetService } from './AssetService';

// Mock Prisma
jest.mock('@emaintanance/database');

const mockPrisma = {
  asset: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
} as unknown as PrismaClient;

describe('AssetService', () => {
  let assetService: AssetService;

  beforeEach(() => {
    assetService = new AssetService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('getDowntimeStatistics', () => {
    beforeEach(() => {
      const mockAssets = [
        {
          id: 'asset1',
          assetCode: 'EQ001',
          name: 'Equipment 1',
          maintenanceHistory: [
            { completedAt: new Date('2024-01-15') },
          ],
          workOrders: [
            {
              reportedAt: new Date('2024-01-01T08:00:00Z'),
              completedAt: new Date('2024-01-01T12:00:00Z'), // 4 hours downtime
            },
            {
              reportedAt: new Date('2024-01-02T09:00:00Z'),
              completedAt: new Date('2024-01-02T11:00:00Z'), // 2 hours downtime
            },
          ],
        },
        {
          id: 'asset2',
          assetCode: 'EQ002',
          name: 'Equipment 2',
          maintenanceHistory: [],
          workOrders: [
            {
              reportedAt: new Date('2024-01-03T10:00:00Z'),
              completedAt: new Date('2024-01-03T18:00:00Z'), // 8 hours downtime
            },
          ],
        },
      ];

      (mockPrisma.asset.findMany as jest.Mock).mockResolvedValue(mockAssets);
    });

    it('should calculate downtime statistics correctly', async () => {
      const result = await assetService.getDowntimeStatistics();

      expect(result).toHaveLength(2);
      
      expect(result[0]).toEqual({
        assetId: 'asset1',
        assetCode: 'EQ001',
        assetName: 'Equipment 1',
        totalDowntimeHours: 6, // 4 + 2 hours
        downtimeIncidents: 2,
        averageDowntimePerIncident: 3, // 6/2
        lastMaintenanceDate: new Date('2024-01-15'),
      });

      expect(result[1]).toEqual({
        assetId: 'asset2',
        assetCode: 'EQ002',
        assetName: 'Equipment 2',
        totalDowntimeHours: 8,
        downtimeIncidents: 1,
        averageDowntimePerIncident: 8,
        lastMaintenanceDate: undefined,
      });
    });
  });

  describe('getDowntimeRanking', () => {
    it('should return top assets by downtime', async () => {
      jest.spyOn(assetService, 'getDowntimeStatistics').mockResolvedValue([
        {
          assetId: 'asset1',
          assetCode: 'EQ001',
          assetName: 'Equipment 1',
          totalDowntimeHours: 10,
          downtimeIncidents: 2,
          averageDowntimePerIncident: 5,
        },
        {
          assetId: 'asset2',
          assetCode: 'EQ002',
          assetName: 'Equipment 2',
          totalDowntimeHours: 20,
          downtimeIncidents: 1,
          averageDowntimePerIncident: 20,
        },
        {
          assetId: 'asset3',
          assetCode: 'EQ003',
          assetName: 'Equipment 3',
          totalDowntimeHours: 5,
          downtimeIncidents: 1,
          averageDowntimePerIncident: 5,
        },
      ]);

      const result = await assetService.getDowntimeRanking({ limit: 2 });

      expect(result).toHaveLength(2);
      expect(result[0].assetCode).toBe('EQ002'); // Highest downtime first
      expect(result[1].assetCode).toBe('EQ001');
    });
  });

  describe('getFaultFrequencyRanking', () => {
    it('should return top assets by fault frequency', async () => {
      const mockPerformanceData = [
        {
          assetId: 'asset1',
          assetCode: 'EQ001',
          assetName: 'Equipment 1',
          location: 'Building A',
          downtimeHours: 10,
          faultFrequency: 5,
          maintenanceCost: 5000,
          healthScore: 70,
        },
        {
          assetId: 'asset2',
          assetCode: 'EQ002',
          assetName: 'Equipment 2',
          location: 'Building B',
          downtimeHours: 8,
          faultFrequency: 8,
          maintenanceCost: 4000,
          healthScore: 60,
        },
      ];

      jest.spyOn(assetService as any, 'getPerformanceRanking').mockResolvedValue(mockPerformanceData);

      const result = await assetService.getFaultFrequencyRanking({ limit: 2 });

      expect(result).toHaveLength(2);
      expect(result[0].faultFrequency).toBe(8); // Higher frequency first
      expect(result[1].faultFrequency).toBe(5);
    });
  });

  describe('getHealthOverview', () => {
    beforeEach(() => {
      (mockPrisma.asset.count as jest.Mock)
        .mockResolvedValueOnce(100) // Total assets
        .mockResolvedValueOnce(85); // Active assets

      const mockPerformanceData = [
        { healthScore: 80 },
        { healthScore: 60 },
        { healthScore: 40 }, // Critical asset
        { healthScore: 90 },
        { healthScore: 30 }, // Critical asset
      ];

      jest.spyOn(assetService as any, 'getPerformanceRanking').mockResolvedValue(mockPerformanceData);
    });

    it('should calculate health overview correctly', async () => {
      const result = await assetService.getHealthOverview();

      expect(result.totalAssets).toBe(100);
      expect(result.activeAssets).toBe(85);
      expect(result.assetsWithIssues).toBe(3); // Assets with health score < 70
      expect(result.averageHealthScore).toBe(60); // (80+60+40+90+30)/5
      expect(result.criticalAssets).toHaveLength(2); // Assets with health score < 50
    });
  });

  describe('getCriticalAssets', () => {
    it('should return assets with health score below 50', async () => {
      const mockPerformanceData = [
        {
          assetId: 'asset1',
          assetCode: 'EQ001',
          assetName: 'Equipment 1',
          location: 'Building A',
          downtimeHours: 20,
          faultFrequency: 10,
          maintenanceCost: 8000,
          healthScore: 30,
        },
        {
          assetId: 'asset2',
          assetCode: 'EQ002',
          assetName: 'Equipment 2',
          location: 'Building B',
          downtimeHours: 5,
          faultFrequency: 2,
          maintenanceCost: 2000,
          healthScore: 80,
        },
        {
          assetId: 'asset3',
          assetCode: 'EQ003',
          assetName: 'Equipment 3',
          location: 'Building C',
          downtimeHours: 15,
          faultFrequency: 8,
          maintenanceCost: 6000,
          healthScore: 45,
        },
      ];

      jest.spyOn(assetService as any, 'getPerformanceRanking').mockResolvedValue(mockPerformanceData);

      const result = await assetService.getCriticalAssets({ limit: 5 });

      expect(result).toHaveLength(2); // Only assets with health score < 50
      expect(result[0].healthScore).toBe(30); // Lowest health score first
      expect(result[1].healthScore).toBe(45);
    });
  });

  describe('filters', () => {
    it('should apply location filter correctly', async () => {
      await assetService.getDowntimeStatistics({ location: 'Building A' });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: { location: 'Building A' },
        include: expect.any(Object),
      });
    });

    it('should apply time range filter correctly', async () => {
      await assetService.getDowntimeStatistics({ timeRange: 'month' });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          maintenanceHistory: {
            where: {
              completedAt: {
                gte: expect.any(Date),
              },
            },
            orderBy: { completedAt: 'desc' },
          },
          workOrders: {
            where: {
              reportedAt: {
                gte: expect.any(Date),
              },
              status: 'COMPLETED',
              completedAt: { not: null },
            },
            select: expect.any(Object),
          },
        },
      });
    });
  });
});