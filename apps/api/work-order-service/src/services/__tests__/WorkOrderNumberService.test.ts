import { PrismaClient } from '@emaintenance/database';
import { WorkOrderNumberService } from '../WorkOrderNumberService';

// Mock PrismaClient
jest.mock('@emaintenance/database', () => ({
  PrismaClient: jest.fn(),
}));

describe('WorkOrderNumberService', () => {
  let prisma: jest.Mocked<PrismaClient>;
  let service: WorkOrderNumberService;
  let mockTx: any;

  beforeEach(() => {
    prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    service = new WorkOrderNumberService(prisma);
    
    // Mock transaction
    mockTx = {
      workOrderSequence: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
    };
    
    prisma.$transaction = jest.fn().mockImplementation((callback) => callback(mockTx));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateWorkOrderNumber', () => {
    it('应该生成正确格式的工单号码', async () => {
      const year = new Date().getFullYear();
      
      // Mock upsert returning existing sequence
      mockTx.workOrderSequence.upsert.mockResolvedValue({
        year,
        sequence: 0,
      });
      
      mockTx.workOrderSequence.update.mockResolvedValue({
        year,
        sequence: 1,
      });

      const workOrderNumber = await service.generateWorkOrderNumber();

      expect(workOrderNumber).toMatch(/^MO\d{9}$/);
      expect(workOrderNumber.substring(2, 6)).toBe(year.toString());
      expect(workOrderNumber).toBe(`MO${year}00001`);
    });

    it('应该使用upsert创建新的年度序列记录', async () => {
      const year = new Date().getFullYear();
      
      // Mock upsert creating new sequence
      mockTx.workOrderSequence.upsert.mockResolvedValue({
        year,
        sequence: 0,
      });
      
      mockTx.workOrderSequence.update.mockResolvedValue({
        year,
        sequence: 1,
      });

      const workOrderNumber = await service.generateWorkOrderNumber();

      expect(mockTx.workOrderSequence.upsert).toHaveBeenCalledWith({
        where: { year },
        update: {},
        create: { year, sequence: 0 },
      });
      expect(workOrderNumber).toBe(`MO${year}00001`);
    });

    it('应该正确递增序列号', async () => {
      const year = new Date().getFullYear();
      
      // Mock existing sequence with count 99
      mockTx.workOrderSequence.upsert.mockResolvedValue({
        year,
        sequence: 99,
      });
      
      mockTx.workOrderSequence.update.mockResolvedValue({
        year,
        sequence: 100,
      });

      const workOrderNumber = await service.generateWorkOrderNumber();

      expect(mockTx.workOrderSequence.update).toHaveBeenCalledWith({
        where: { year },
        data: {
          sequence: { increment: 1 },
          lastUpdated: expect.any(Date),
        },
      });
      expect(workOrderNumber).toBe(`MO${year}00100`);
    });

    it('应该处理5位数字的序列号', async () => {
      const year = new Date().getFullYear();
      
      mockTx.workOrderSequence.upsert.mockResolvedValue({
        year,
        sequence: 9999,
      });
      
      mockTx.workOrderSequence.update.mockResolvedValue({
        year,
        sequence: 10000,
      });

      const workOrderNumber = await service.generateWorkOrderNumber();

      expect(workOrderNumber).toBe(`MO${year}10000`);
    });

    it('应该确保并发环境下号码唯一性', async () => {
      const year = new Date().getFullYear();
      let sequenceCounter = 0;
      
      mockTx.workOrderSequence.upsert.mockResolvedValue({
        year,
        sequence: 0,
      });
      
      mockTx.workOrderSequence.update.mockImplementation(() => {
        sequenceCounter++;
        return Promise.resolve({
          year,
          sequence: sequenceCounter,
        });
      });

      // Simulate concurrent generation
      const promises = Array.from({ length: 10 }, () => 
        service.generateWorkOrderNumber()
      );
      
      const numbers = await Promise.all(promises);
      const uniqueNumbers = new Set(numbers);
      
      expect(uniqueNumbers.size).toBe(10);
      
      // Check all numbers are sequential
      numbers.forEach((number, index) => {
        const expectedSequence = (index + 1).toString().padStart(5, '0');
        expect(number).toBe(`MO${year}${expectedSequence}`);
      });
    });

    it('应该在序列超过99999时抛出错误', async () => {
      const year = new Date().getFullYear();
      
      // Mock sequence at maximum limit
      mockTx.workOrderSequence.upsert.mockResolvedValue({
        year,
        sequence: 99999,
      });

      await expect(service.generateWorkOrderNumber()).rejects.toThrow(
        `Work order sequence overflow for year ${year}. Maximum 99,999 work orders per year.`
      );
    });

    it('应该使用Asia/Shanghai时区确定年份', async () => {
      // Mock current time to be December 31, 2024 23:30 UTC 
      // which is January 1, 2025 07:30 in Asia/Shanghai timezone
      jest.useFakeTimers();
      const mockDate = new Date('2024-12-31T23:30:00.000Z');
      jest.setSystemTime(mockDate);

      // Expected year should be 2025 based on Asia/Shanghai timezone
      const expectedYear = 2025;

      mockTx.workOrderSequence.upsert.mockResolvedValue({
        year: expectedYear,
        sequence: 0,
      });
      
      mockTx.workOrderSequence.update.mockResolvedValue({
        year: expectedYear,
        sequence: 1,
      });

      const workOrderNumber = await service.generateWorkOrderNumber();

      expect(mockTx.workOrderSequence.upsert).toHaveBeenCalledWith({
        where: { year: expectedYear },
        update: {},
        create: { year: expectedYear, sequence: 0 }
      });

      expect(workOrderNumber).toBe(`MO${expectedYear}00001`);
      
      jest.useRealTimers();
    });
  });

  describe('initializeCurrentYearSequence', () => {
    it('应该使用upsert创建或更新当前年度序列', async () => {
      const year = new Date().getFullYear();
      
      prisma.workOrderSequence = {
        upsert: jest.fn().mockResolvedValue({ year, sequence: 0 }),
      } as any;

      await service.initializeCurrentYearSequence();

      expect(prisma.workOrderSequence.upsert).toHaveBeenCalledWith({
        where: { year },
        update: {},
        create: { year, sequence: 0 },
      });
    });

    it('应该使用Asia/Shanghai时区确定年份', async () => {
      // Mock current time to be December 31, 2024 23:30 UTC 
      jest.useFakeTimers();
      const mockDate = new Date('2024-12-31T23:30:00.000Z');
      jest.setSystemTime(mockDate);

      const expectedYear = 2025;
      
      prisma.workOrderSequence = {
        upsert: jest.fn().mockResolvedValue({ year: expectedYear, sequence: 0 }),
      } as any;

      await service.initializeCurrentYearSequence();

      expect(prisma.workOrderSequence.upsert).toHaveBeenCalledWith({
        where: { year: expectedYear },
        update: {},
        create: { year: expectedYear, sequence: 0 },
      });
      
      jest.useRealTimers();
    });
  });

  describe('getCurrentSequence', () => {
    it('应该返回指定年份的当前序列号', async () => {
      const year = 2025;
      
      prisma.workOrderSequence = {
        findUnique: jest.fn().mockResolvedValue({ year, sequence: 150 }),
      } as any;

      const sequence = await service.getCurrentSequence(year);

      expect(sequence).toBe(150);
      expect(prisma.workOrderSequence.findUnique).toHaveBeenCalledWith({
        where: { year },
      });
    });

    it('应该返回0如果年份序列不存在', async () => {
      const year = 2026;
      
      prisma.workOrderSequence = {
        findUnique: jest.fn().mockResolvedValue(null),
      } as any;

      const sequence = await service.getCurrentSequence(year);

      expect(sequence).toBe(0);
    });
  });
});