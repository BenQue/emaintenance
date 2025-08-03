import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdvancedWorkOrderList } from '../AdvancedWorkOrderList';
import { workOrderService } from '../../../lib/services/work-order-service';
import { WorkOrder } from '../../../lib/types/work-order';

jest.mock('../../../lib/services/work-order-service');
jest.mock('../../../lib/stores/work-order-filter-store', () => ({
  useWorkOrderFilterStore: () => ({
    currentPage: 1,
    pageSize: 20,
    isLoading: false,
    error: null,
    setPage: jest.fn(),
    setPageSize: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
  }),
}));

const mockWorkOrderService = workOrderService as jest.Mocked<typeof workOrderService>;

const mockWorkOrder: WorkOrder = {
  id: 'wo-1',
  title: '测试工单',
  description: '测试工单描述',
  category: '故障',
  reason: '设备故障',
  location: '车间A',
  priority: 'HIGH',
  status: 'PENDING',
  reportedAt: new Date('2025-08-03T10:00:00Z'),
  startedAt: null,
  completedAt: null,
  solution: null,
  faultCode: null,
  attachments: [],
  createdAt: new Date('2025-08-03T10:00:00Z'),
  updatedAt: new Date('2025-08-03T10:00:00Z'),
  assetId: 'asset-1',
  createdById: 'user-1',
  assignedToId: 'user-2',
  asset: {
    id: 'asset-1',
    assetCode: 'EQ001',
    name: '设备1',
    location: '车间A',
  },
  createdBy: {
    id: 'user-1',
    firstName: '张',
    lastName: '三',
    email: 'zhangsan@example.com',
  },
  assignedTo: {
    id: 'user-2',
    firstName: '李',
    lastName: '四',
    email: 'lisi@example.com',
  },
};

const mockPaginatedWorkOrders = {
  workOrders: [mockWorkOrder],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
};

describe('AdvancedWorkOrderList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkOrderService.getAllWorkOrders.mockResolvedValue(mockPaginatedWorkOrders);
  });

  it('renders work orders list', async () => {
    render(<AdvancedWorkOrderList filters={{}} />);
    
    await waitFor(() => {
      expect(screen.getByText('测试工单')).toBeInTheDocument();
    });
    
    expect(screen.getByText('测试工单描述')).toBeInTheDocument();
    expect(screen.getByText('EQ001 - 设备1')).toBeInTheDocument();
    expect(screen.getByText('李 四')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<AdvancedWorkOrderList filters={{}} />);
    
    // Should show loading skeletons initially
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(5);
  });

  it('shows empty state when no work orders', async () => {
    mockWorkOrderService.getAllWorkOrders.mockResolvedValue({
      workOrders: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    
    render(<AdvancedWorkOrderList filters={{}} />);
    
    await waitFor(() => {
      expect(screen.getByText('没有找到符合条件的工单')).toBeInTheDocument();
    });
  });

  it('calls onWorkOrderClick when work order is clicked', async () => {
    const onWorkOrderClick = jest.fn();
    render(<AdvancedWorkOrderList filters={{}} onWorkOrderClick={onWorkOrderClick} />);
    
    await waitFor(() => {
      expect(screen.getByText('测试工单')).toBeInTheDocument();
    });
    
    const workOrderCard = screen.getByText('测试工单').closest('.cursor-pointer');
    expect(workOrderCard).toBeInTheDocument();
    
    if (workOrderCard) {
      fireEvent.click(workOrderCard);
      expect(onWorkOrderClick).toHaveBeenCalledWith(mockWorkOrder);
    }
  });

  it('loads work orders with filters', async () => {
    const filters = { status: 'PENDING', priority: 'HIGH' };
    render(<AdvancedWorkOrderList filters={filters} />);
    
    await waitFor(() => {
      expect(mockWorkOrderService.getAllWorkOrders).toHaveBeenCalledWith(
        filters,
        1,
        20
      );
    });
  });

  it('displays correct priority and status badges', async () => {
    render(<AdvancedWorkOrderList filters={{}} />);
    
    await waitFor(() => {
      expect(screen.getByText('待处理')).toBeInTheDocument();
      expect(screen.getByText('高')).toBeInTheDocument();
    });
  });

  it('shows results summary', async () => {
    render(<AdvancedWorkOrderList filters={{}} />);
    
    await waitFor(() => {
      expect(screen.getByText('显示第 1-1 条，共 1 条工单')).toBeInTheDocument();
    });
  });
});