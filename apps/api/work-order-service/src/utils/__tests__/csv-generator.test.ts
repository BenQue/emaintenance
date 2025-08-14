import { CSVGenerator } from '../csv-generator';
import { WorkOrderForCSV } from '../../types/work-order';
import { Priority, WorkOrderStatus } from '@emaintenance/database';

describe('CSVGenerator', () => {
  const mockWorkOrder: WorkOrderForCSV = {
    id: 'wo-1',
    title: 'Test Work Order',
    description: 'Test description',
    category: '故障',
    reason: '设备故障',
    location: '车间A',
    priority: Priority.HIGH,
    status: WorkOrderStatus.COMPLETED,
    reportedAt: new Date('2025-08-03T10:00:00Z'),
    startedAt: new Date('2025-08-03T11:00:00Z'),
    completedAt: new Date('2025-08-03T12:00:00Z'),
    solution: 'Fixed issue',
    faultCode: 'E001',
    assetCode: 'EQ001',
    assetName: 'Equipment 1',
    createdBy: '张三',
    assignedTo: '李四',
    resolutionDescription: 'Problem resolved',
  };

  describe('generateWorkOrderCSV', () => {
    it('generates CSV with all columns when no columns specified', () => {
      const csv = CSVGenerator.generateWorkOrderCSV([mockWorkOrder]);
      
      expect(csv).toContain('ID,Title,Description');
      expect(csv).toContain('wo-1,Test Work Order,Test description');
      expect(csv).toContain('HIGH,COMPLETED');
    });

    it('generates CSV with specified columns only', () => {
      const columns = ['id', 'title', 'status'];
      const csv = CSVGenerator.generateWorkOrderCSV([mockWorkOrder], columns);
      
      expect(csv).toBe('ID,Title,Status\nwo-1,Test Work Order,COMPLETED');
    });

    it('handles empty array', () => {
      const csv = CSVGenerator.generateWorkOrderCSV([]);
      
      expect(csv).toBe('No data available');
    });

    it('escapes CSV fields properly', () => {
      const workOrderWithCommas: WorkOrderForCSV = {
        ...mockWorkOrder,
        title: 'Work, Order, With, Commas',
        description: 'Description with "quotes" and commas',
      };

      const csv = CSVGenerator.generateWorkOrderCSV([workOrderWithCommas], ['title', 'description']);
      
      expect(csv).toContain('"Work, Order, With, Commas"');
      expect(csv).toContain('"Description with ""quotes"" and commas"');
    });

    it('formats dates to ISO string', () => {
      const csv = CSVGenerator.generateWorkOrderCSV([mockWorkOrder], ['reportedAt']);
      
      expect(csv).toContain('2025-08-03T10:00:00.000Z');
    });

    it('handles null and undefined values', () => {
      const workOrderWithNulls: WorkOrderForCSV = {
        ...mockWorkOrder,
        location: null,
        solution: undefined,
        startedAt: null,
      };

      const csv = CSVGenerator.generateWorkOrderCSV([workOrderWithNulls], ['location', 'startedAt', 'solution']);
      
      expect(csv).toContain('Location,Started At,Solution\n,,');
    });

    it('generates CSV for multiple work orders', () => {
      const workOrder2: WorkOrderForCSV = {
        ...mockWorkOrder,
        id: 'wo-2',
        title: 'Second Work Order',
      };

      const csv = CSVGenerator.generateWorkOrderCSV([mockWorkOrder, workOrder2], ['id', 'title']);
      
      expect(csv).toBe('ID,Title\nwo-1,Test Work Order\nwo-2,Second Work Order');
    });
  });

  describe('getAvailableColumns', () => {
    it('returns all available columns', () => {
      const columns = CSVGenerator.getAvailableColumns();
      
      expect(columns).toHaveLength(18);
      expect(columns[0]).toEqual({ key: 'id', label: 'ID' });
      expect(columns[1]).toEqual({ key: 'title', label: 'Title' });
      expect(columns.find(col => col.key === 'resolutionDescription')).toBeDefined();
    });

    it('returns a new array each time (immutable)', () => {
      const columns1 = CSVGenerator.getAvailableColumns();
      const columns2 = CSVGenerator.getAvailableColumns();
      
      expect(columns1).not.toBe(columns2);
      expect(columns1).toEqual(columns2);
    });
  });
});