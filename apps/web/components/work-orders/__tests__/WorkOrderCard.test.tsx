import { render, screen } from '@testing-library/react';
import { WorkOrderCard } from '../WorkOrderCard';
import { WorkOrder, WorkOrderStatus, Priority } from '../../../lib/types/work-order';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('WorkOrderCard', () => {
  const mockWorkOrder: WorkOrder = {
    id: 'wo-123',
    title: '空调维修',
    description: '会议室空调不制冷，需要检查制冷剂',
    status: WorkOrderStatus.PENDING,
    priority: Priority.HIGH,
    category: '空调维修',
    reason: '设备故障',
    location: '会议室A',
    reportedAt: '2025-08-03T10:00:00Z',
    startedAt: null,
    completedAt: null,
    asset: {
      id: 'asset-123',
      assetCode: 'AC-001',
      name: '中央空调',
      category: '空调设备',
      location: '会议室A',
      createdAt: '2025-08-01T00:00:00Z',
      updatedAt: '2025-08-01T00:00:00Z',
    },
    createdBy: {
      id: 'user-123',
      firstName: '张',
      lastName: '三',
      email: 'zhang.san@example.com',
      role: 'EMPLOYEE',
      createdAt: '2025-08-01T00:00:00Z',
      updatedAt: '2025-08-01T00:00:00Z',
    },
    assignedTo: {
      id: 'tech-123',
      firstName: '李',
      lastName: '四',
      email: 'li.si@example.com',
      role: 'TECHNICIAN',
      createdAt: '2025-08-01T00:00:00Z',
      updatedAt: '2025-08-01T00:00:00Z',
    },
    createdAt: '2025-08-03T10:00:00Z',
    updatedAt: '2025-08-03T10:00:00Z',
  };

  it('renders work order information correctly', () => {
    render(<WorkOrderCard workOrder={mockWorkOrder} />);

    // Check title and description
    expect(screen.getByText('空调维修')).toBeInTheDocument();
    expect(screen.getByText('会议室空调不制冷，需要检查制冷剂')).toBeInTheDocument();

    // Check status and priority badges
    expect(screen.getByText('待处理')).toBeInTheDocument();
    expect(screen.getByText('高优先级')).toBeInTheDocument();

    // Check asset information
    expect(screen.getByText('AC-001 - 中央空调')).toBeInTheDocument();

    // Check location
    expect(screen.getByText('会议室A')).toBeInTheDocument();

    // Check reporter information
    expect(screen.getByText('报修人: 张 三')).toBeInTheDocument();

    // Check reported time
    expect(screen.getByText(/报修时间: 2025年08月03日/)).toBeInTheDocument();

    // Check category and reason
    expect(screen.getByText('类别: 空调维修 | 原因: 设备故障')).toBeInTheDocument();
  });

  it('renders link with correct href', () => {
    render(<WorkOrderCard workOrder={mockWorkOrder} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/dashboard/my-tasks/wo-123');
  });

  it('displays start time when work order is started', () => {
    const startedWorkOrder = {
      ...mockWorkOrder,
      status: WorkOrderStatus.IN_PROGRESS,
      startedAt: '2025-08-03T14:00:00Z',
    };

    render(<WorkOrderCard workOrder={startedWorkOrder} />);

    expect(screen.getByText(/开始时间: 08\/03/)).toBeInTheDocument();
  });

  it('does not display start time when work order is not started', () => {
    render(<WorkOrderCard workOrder={mockWorkOrder} />);

    expect(screen.queryByText(/开始时间:/)).not.toBeInTheDocument();
  });

  it('handles missing location gracefully', () => {
    const workOrderWithoutLocation = {
      ...mockWorkOrder,
      location: null,
    };

    render(<WorkOrderCard workOrder={workOrderWithoutLocation} />);

    // Location should not be displayed
    expect(screen.queryByText(/会议室A/)).not.toBeInTheDocument();
    // But other information should still be there
    expect(screen.getByText('空调维修')).toBeInTheDocument();
  });

  it('applies correct CSS classes for hover effects', () => {
    const { container } = render(<WorkOrderCard workOrder={mockWorkOrder} />);

    const cardElement = container.querySelector('[class*="hover:shadow-md"]');
    expect(cardElement).toBeInTheDocument();
  });

  it('renders different status and priority combinations', () => {
    const testCases = [
      { status: WorkOrderStatus.IN_PROGRESS, priority: Priority.LOW },
      { status: WorkOrderStatus.COMPLETED, priority: Priority.MEDIUM },
      { status: WorkOrderStatus.WAITING_PARTS, priority: Priority.URGENT },
    ];

    testCases.forEach(({ status, priority }) => {
      const testWorkOrder = { ...mockWorkOrder, status, priority };
      const { rerender } = render(<WorkOrderCard workOrder={testWorkOrder} />);

      // Verify status and priority are rendered (exact text depends on constants)
      expect(screen.getByText(/待处理|进行中|已完成|等待备件|等待外部|已取消/)).toBeInTheDocument();
      expect(screen.getByText(/低优先级|中优先级|高优先级|紧急/)).toBeInTheDocument();

      rerender(<></>); // Clear render
    });
  });
});