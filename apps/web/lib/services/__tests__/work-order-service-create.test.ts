import { workOrderService } from '../work-order-service';
import { Priority } from '../../types/work-order';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('WorkOrderService - Create Operations', () => {
  const API_BASE_URL = 'http://localhost:3002';
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    mockFetch.mockClear();
    mockLocalStorage.getItem.mockReturnValue(mockToken);
  });

  describe('createWorkOrder', () => {
    const mockWorkOrderData = {
      assetId: 'asset-123',
      title: 'Test Work Order',
      category: '设备故障',
      reason: '机械故障',
      location: '生产车间A',
      priority: Priority.HIGH,
      description: 'Test description',
    };

    const mockCreatedWorkOrder = {
      id: 'wo-123',
      ...mockWorkOrderData,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    it('should create work order without photos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockCreatedWorkOrder }),
      } as Response);

      const result = await workOrderService.createWorkOrder(mockWorkOrderData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/work-orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
          body: JSON.stringify({
            assetId: mockWorkOrderData.assetId,
            title: mockWorkOrderData.title,
            category: mockWorkOrderData.category,
            reason: mockWorkOrderData.reason,
            location: mockWorkOrderData.location,
            priority: mockWorkOrderData.priority,
            description: mockWorkOrderData.description,
          }),
        }
      );

      expect(result).toEqual(mockCreatedWorkOrder);
    });

    it('should create work order with photos using FormData', async () => {
      const mockPhoto = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const workOrderDataWithPhotos = {
        ...mockWorkOrderData,
        photos: [mockPhoto],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockCreatedWorkOrder }),
      } as Response);

      const result = await workOrderService.createWorkOrder(workOrderDataWithPhotos);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/work-orders`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
          body: expect.any(FormData),
        })
      );

      // Check that FormData contains the expected fields
      const [[, options]] = mockFetch.mock.calls;
      const formData = options.body as FormData;
      expect(formData.get('assetId')).toBe(mockWorkOrderData.assetId);
      expect(formData.get('title')).toBe(mockWorkOrderData.title);
      expect(formData.get('category')).toBe(mockWorkOrderData.category);
      expect(formData.get('reason')).toBe(mockWorkOrderData.reason);
      expect(formData.get('priority')).toBe(mockWorkOrderData.priority);
      expect(formData.getAll('attachments')).toHaveLength(1);

      expect(result).toEqual(mockCreatedWorkOrder);
    });

    it('should handle optional fields correctly', async () => {
      const minimalWorkOrderData = {
        assetId: 'asset-minimal',
        title: 'Minimal Work Order',
        category: '设备故障',
        reason: '机械故障',
        priority: Priority.MEDIUM,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockCreatedWorkOrder }),
      } as Response);

      await workOrderService.createWorkOrder(minimalWorkOrderData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/work-orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
          body: JSON.stringify({
            assetId: minimalWorkOrderData.assetId,
            title: minimalWorkOrderData.title,
            category: minimalWorkOrderData.category,
            reason: minimalWorkOrderData.reason,
            priority: minimalWorkOrderData.priority,
          }),
        }
      );
    });

    it('should handle API errors', async () => {
      const errorMessage = 'Work order creation failed';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: errorMessage }),
      } as Response);

      await expect(workOrderService.createWorkOrder(mockWorkOrderData))
        .rejects
        .toThrow(errorMessage);
    });

    it('should handle network errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Network error')),
      } as Response);

      await expect(workOrderService.createWorkOrder(mockWorkOrderData))
        .rejects
        .toThrow('Network error');
    });

    it('should work without authentication token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockCreatedWorkOrder }),
      } as Response);

      await workOrderService.createWorkOrder(mockWorkOrderData);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/work-orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assetId: mockWorkOrderData.assetId,
            title: mockWorkOrderData.title,
            category: mockWorkOrderData.category,
            reason: mockWorkOrderData.reason,
            location: mockWorkOrderData.location,
            priority: mockWorkOrderData.priority,
            description: mockWorkOrderData.description,
          }),
        }
      );
    });
  });

  describe('getFormOptions', () => {
    it('should return form options from filter options', async () => {
      const mockFilterOptions = {
        statuses: ['PENDING', 'IN_PROGRESS'],
        priorities: ['LOW', 'HIGH'],
        categories: ['设备故障', '预防性维护'],
        assets: [],
        users: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFilterOptions),
      } as Response);

      const result = await workOrderService.getFormOptions();

      expect(result).toEqual({
        categories: ['设备故障', '预防性维护'],
        reasons: ['机械故障', '电气故障', '软件问题', '磨损老化', '操作错误', '外部因素'],
        commonLocations: ['生产车间A', '生产车间B', '仓库区域', '办公区域', '设备机房'],
      });
    });

    it('should return default options when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await workOrderService.getFormOptions();

      expect(result).toEqual({
        categories: ['设备故障', '预防性维护', '常规检查', '清洁维护'],
        reasons: ['机械故障', '电气故障', '软件问题', '磨损老化', '操作错误', '外部因素'],
        commonLocations: ['生产车间A', '生产车间B', '仓库区域', '办公区域', '设备机房'],
      });
    });

    it('should use default categories when filter options are empty', async () => {
      const mockFilterOptions = {
        statuses: [],
        priorities: [],
        categories: [],
        assets: [],
        users: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFilterOptions),
      } as Response);

      const result = await workOrderService.getFormOptions();

      expect(result.categories).toEqual(['设备故障', '预防性维护', '常规检查', '清洁维护']);
    });
  });
});