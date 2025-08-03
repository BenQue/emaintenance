import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkOrderList } from '../WorkOrderList';
import { useWorkOrderStore } from '../../../lib/stores/work-order-store';
import { WorkOrder, WorkOrderStatus, Priority } from '../../../lib/types/work-order';

// Mock the store
jest.mock('../../../lib/stores/work-order-store');
const mockUseWorkOrderStore = useWorkOrderStore as jest.MockedFunction<typeof useWorkOrderStore>;

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('WorkOrderList', () => {
  const mockWorkOrders: WorkOrder[] = [
    {
      id: 'wo-1',
      title: '空调维修',
      description: '会议室空调不制冷',
      status: WorkOrderStatus.PENDING,
      priority: Priority.HIGH,
      category: '空调维修',
      reason: '设备故障',
      location: '会议室A',
      reportedAt: '2025-08-03T10:00:00Z',
      startedAt: null,
      completedAt: null,
      asset: {
        id: 'asset-1',
        assetCode: 'AC-001',
        name: '中央空调',
        category: '空调设备',
        location: '会议室A',
        createdAt: '2025-08-01T00:00:00Z',
        updatedAt: '2025-08-01T00:00:00Z',
      },
      createdBy: {
        id: 'user-1',
        firstName: '张',
        lastName: '三',
        email: 'zhang.san@example.com',
        role: 'EMPLOYEE',
        createdAt: '2025-08-01T00:00:00Z',
        updatedAt: '2025-08-01T00:00:00Z',
      },
      assignedTo: {
        id: 'tech-1',
        firstName: '李',
        lastName: '四',
        email: 'li.si@example.com',
        role: 'TECHNICIAN',
        createdAt: '2025-08-01T00:00:00Z',
        updatedAt: '2025-08-01T00:00:00Z',
      },
      createdAt: '2025-08-03T10:00:00Z',
      updatedAt: '2025-08-03T10:00:00Z',
    },
    {
      id: 'wo-2',
      title: '电梯维护',
      description: '定期保养电梯',
      status: WorkOrderStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      category: '电梯维护',
      reason: '定期保养',
      location: '大厅',
      reportedAt: '2025-08-03T09:00:00Z',
      startedAt: '2025-08-03T11:00:00Z',
      completedAt: null,
      asset: {
        id: 'asset-2',
        assetCode: 'EL-001',
        name: '客用电梯',
        category: '电梯设备',
        location: '大厅',
        createdAt: '2025-08-01T00:00:00Z',
        updatedAt: '2025-08-01T00:00:00Z',
      },
      createdBy: {
        id: 'user-2',
        firstName: '王',
        lastName: '五',
        email: 'wang.wu@example.com',
        role: 'EMPLOYEE',
        createdAt: '2025-08-01T00:00:00Z',
        updatedAt: '2025-08-01T00:00:00Z',
      },
      assignedTo: {
        id: 'tech-1',
        firstName: '李',
        lastName: '四',
        email: 'li.si@example.com',
        role: 'TECHNICIAN',
        createdAt: '2025-08-01T00:00:00Z',
        updatedAt: '2025-08-01T00:00:00Z',
      },
      createdAt: '2025-08-03T09:00:00Z',
      updatedAt: '2025-08-03T11:00:00Z',
    },
  ];

  const defaultMockStore = {
    assignedWorkOrders: mockWorkOrders,
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    },
    loadAssignedWorkOrders: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkOrderStore.mockReturnValue(defaultMockStore);
  });

  it('renders header with work order count', () => {
    render(<WorkOrderList />);

    expect(screen.getByText('我的任务')).toBeInTheDocument();
    expect(screen.getByText('共 2 个分配给您的工单')).toBeInTheDocument();
  });

  it('loads assigned work orders on mount', () => {
    render(<WorkOrderList />);

    expect(defaultMockStore.loadAssignedWorkOrders).toHaveBeenCalledTimes(1);
  });

  it('renders work order cards when data is available', () => {
    render(<WorkOrderList />);

    expect(screen.getByText('空调维修')).toBeInTheDocument();
    expect(screen.getByText('电梯维护')).toBeInTheDocument();
  });

  it('shows loading state when loading', () => {
    mockUseWorkOrderStore.mockReturnValue({
      ...defaultMockStore,
      loading: true,
      assignedWorkOrders: [],
    });

    render(<WorkOrderList />);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('shows error state when there is an error', () => {
    const errorMessage = '加载工单失败';
    mockUseWorkOrderStore.mockReturnValue({
      ...defaultMockStore,
      error: errorMessage,
    });

    render(<WorkOrderList />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('重试')).toBeInTheDocument();
  });

  it('handles retry button click in error state', () => {
    const mockClearError = jest.fn();
    const mockLoadAssignedWorkOrders = jest.fn();
    mockUseWorkOrderStore.mockReturnValue({
      ...defaultMockStore,
      error: '加载失败',
      clearError: mockClearError,
      loadAssignedWorkOrders: mockLoadAssignedWorkOrders,
    });

    render(<WorkOrderList />);

    const retryButton = screen.getByText('重试');
    fireEvent.click(retryButton);

    expect(mockClearError).toHaveBeenCalled();
    expect(mockLoadAssignedWorkOrders).toHaveBeenCalled();
  });

  it('shows empty state when no work orders are assigned', () => {
    mockUseWorkOrderStore.mockReturnValue({
      ...defaultMockStore,
      assignedWorkOrders: [],
      pagination: { ...defaultMockStore.pagination, total: 0 },
    });

    render(<WorkOrderList />);

    expect(screen.getByText('暂无工单')).toBeInTheDocument();
    expect(screen.getByText('当前没有分配给您的工单')).toBeInTheDocument();
  });

  it('filters work orders by search term', async () => {
    const user = userEvent.setup();
    render(<WorkOrderList />);

    const searchInput = screen.getByPlaceholderText('搜索工单标题、描述或设备...');
    await user.type(searchInput, '空调');

    // Should show only the air conditioning work order
    expect(screen.getByText('空调维修')).toBeInTheDocument();
    expect(screen.queryByText('电梯维护')).not.toBeInTheDocument();
  });

  it('filters work orders by status', async () => {
    const user = userEvent.setup();
    render(<WorkOrderList />);

    const statusSelect = screen.getByDisplayValue('所有状态');
    await user.selectOptions(statusSelect, WorkOrderStatus.PENDING);

    // Should show only pending work orders
    expect(screen.getByText('空调维修')).toBeInTheDocument();
    expect(screen.queryByText('电梯维护')).not.toBeInTheDocument();
  });

  it('filters work orders by priority', async () => {
    const user = userEvent.setup();
    render(<WorkOrderList />);

    const prioritySelect = screen.getByDisplayValue('所有优先级');
    await user.selectOptions(prioritySelect, Priority.HIGH);

    // Should show only high priority work orders
    expect(screen.getByText('空调维修')).toBeInTheDocument();
    expect(screen.queryByText('电梯维护')).not.toBeInTheDocument();
  });

  it('shows filtered empty state when no results match filters', async () => {
    const user = userEvent.setup();
    render(<WorkOrderList />);

    const searchInput = screen.getByPlaceholderText('搜索工单标题、描述或设备...');
    await user.type(searchInput, '不存在的设备');

    expect(screen.getByText('暂无工单')).toBeInTheDocument();
    expect(screen.getByText('没有符合筛选条件的工单')).toBeInTheDocument();
  });

  it('handles refresh button click', () => {
    render(<WorkOrderList />);

    const refreshButton = screen.getByText('刷新');
    fireEvent.click(refreshButton);

    expect(defaultMockStore.loadAssignedWorkOrders).toHaveBeenCalledWith(1, 10);
  });

  it('disables refresh button when loading', () => {
    mockUseWorkOrderStore.mockReturnValue({
      ...defaultMockStore,
      loading: true,
    });

    render(<WorkOrderList />);

    const refreshButton = screen.getByText('刷新');
    expect(refreshButton).toBeDisabled();
  });

  it('shows load more button when there are more pages', () => {
    mockUseWorkOrderStore.mockReturnValue({
      ...defaultMockStore,
      pagination: {
        page: 1,
        limit: 10,
        total: 20,
        totalPages: 2,
      },
    });

    render(<WorkOrderList />);

    expect(screen.getByText('加载更多')).toBeInTheDocument();
  });

  it('handles load more button click', () => {
    mockUseWorkOrderStore.mockReturnValue({
      ...defaultMockStore,
      pagination: {
        page: 1,
        limit: 10,
        total: 20,
        totalPages: 2,
      },
    });

    render(<WorkOrderList />);

    const loadMoreButton = screen.getByText('加载更多');
    fireEvent.click(loadMoreButton);

    expect(defaultMockStore.loadAssignedWorkOrders).toHaveBeenCalledWith(2, 10);
  });

  it('combines multiple filters correctly', async () => {
    const user = userEvent.setup();
    render(<WorkOrderList />);

    // Apply search filter
    const searchInput = screen.getByPlaceholderText('搜索工单标题、描述或设备...');
    await user.type(searchInput, '空调');

    // Apply status filter
    const statusSelect = screen.getByDisplayValue('所有状态');
    await user.selectOptions(statusSelect, WorkOrderStatus.PENDING);

    // Should show air conditioning work order (matches both search and status)
    expect(screen.getByText('空调维修')).toBeInTheDocument();
    expect(screen.queryByText('电梯维护')).not.toBeInTheDocument();
  });
});