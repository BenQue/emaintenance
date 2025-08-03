import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkOrderFilters } from '../WorkOrderFilters';
import { workOrderService } from '../../../lib/services/work-order-service';

jest.mock('../../../lib/services/work-order-service');
jest.mock('../../../lib/stores/work-order-filter-store', () => ({
  useWorkOrderFilterStore: () => ({
    filters: {
      sortBy: 'reportedAt',
      sortOrder: 'desc',
    },
    filterOptions: {
      statuses: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
      priorities: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      categories: ['故障', '维护'],
      assets: [
        { id: 'asset-1', assetCode: 'EQ001', name: '设备1' }
      ],
      users: [
        { id: 'user-1', name: '张三', role: 'TECHNICIAN' }
      ],
    },
    showAdvancedFilters: false,
    isLoading: false,
    setFilter: jest.fn(),
    setFilters: jest.fn(),
    clearFilters: jest.fn(),
    resetFilters: jest.fn(),
    setFilterOptions: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    toggleAdvancedFilters: jest.fn(),
  }),
}));

const mockWorkOrderService = workOrderService as jest.Mocked<typeof workOrderService>;

describe('WorkOrderFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWorkOrderService.getFilterOptions.mockResolvedValue({
      statuses: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
      priorities: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      categories: ['故障', '维护'],
      assets: [
        { id: 'asset-1', assetCode: 'EQ001', name: '设备1' }
      ],
      users: [
        { id: 'user-1', name: '张三', role: 'TECHNICIAN' }
      ],
    });
  });

  it('renders search input', () => {
    render(<WorkOrderFilters />);
    
    const searchInput = screen.getByPlaceholderText('搜索工单标题、描述、设备...');
    expect(searchInput).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(<WorkOrderFilters />);
    
    expect(screen.getByText('高级筛选')).toBeInTheDocument();
    expect(screen.getByText('导出')).toBeInTheDocument();
    expect(screen.getByText('重置')).toBeInTheDocument();
  });

  it('calls onFiltersChange when filters change', async () => {
    const onFiltersChange = jest.fn();
    render(<WorkOrderFilters onFiltersChange={onFiltersChange} />);
    
    const searchInput = screen.getByPlaceholderText('搜索工单标题、描述、设备...');
    fireEvent.change(searchInput, { target: { value: '测试搜索' } });
    
    await waitFor(() => {
      expect(onFiltersChange).toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('calls onExport when export button is clicked', () => {
    const onExport = jest.fn();
    render(<WorkOrderFilters onExport={onExport} />);
    
    const exportButton = screen.getByText('导出');
    fireEvent.click(exportButton);
    
    expect(onExport).toHaveBeenCalled();
  });

  it('loads filter options on mount', async () => {
    render(<WorkOrderFilters />);
    
    await waitFor(() => {
      expect(mockWorkOrderService.getFilterOptions).toHaveBeenCalled();
    });
  });
});