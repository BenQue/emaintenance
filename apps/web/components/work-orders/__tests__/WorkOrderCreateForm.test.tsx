import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkOrderCreateForm } from '../WorkOrderCreateForm';
import { Priority } from '../../../lib/types/work-order';
import { workOrderService } from '../../../lib/services/work-order-service';
import { useWorkOrderStore } from '../../../lib/stores/work-order-store';

// Mock the dependencies
jest.mock('../../../lib/services/work-order-service');
jest.mock('../../../lib/stores/work-order-store');

const mockCreateWorkOrder = jest.fn();
const mockClearCreateError = jest.fn();

const mockUseWorkOrderStore = useWorkOrderStore as jest.MockedFunction<typeof useWorkOrderStore>;

describe('WorkOrderCreateForm', () => {
  const mockOnCancel = jest.fn();
  const mockOnSuccess = jest.fn();

  const mockFormOptions = {
    categories: ['设备故障', '预防性维护'],
    reasons: ['机械故障', '电气故障'],
    commonLocations: ['生产车间A', '仓库区域'],
  };

  beforeEach(() => {
    mockCreateWorkOrder.mockClear();
    mockClearCreateError.mockClear();
    mockOnCancel.mockClear();
    mockOnSuccess.mockClear();

    // Mock the Zustand store
    mockUseWorkOrderStore.mockReturnValue({
      createWorkOrder: mockCreateWorkOrder,
      creating: false,
      createError: null,
      clearCreateError: mockClearCreateError,
      assignedWorkOrders: [],
      currentWorkOrder: null,
      currentWorkOrderWithResolution: null,
      statusHistory: [],
      loading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      loadAssignedWorkOrders: jest.fn(),
      loadWorkOrderWithHistory: jest.fn(),
      loadWorkOrderWithResolution: jest.fn(),
      loadWorkOrderStatusHistory: jest.fn(),
      updateWorkOrderStatus: jest.fn(),
      completeWorkOrder: jest.fn(),
      uploadResolutionPhotos: jest.fn(),
      clearCurrentWorkOrder: jest.fn(),
      clearError: jest.fn(),
      setLoading: jest.fn(),
    });

    // Mock workOrderService
    (workOrderService.getFormOptions as jest.Mock).mockResolvedValue(mockFormOptions);
  });

  it('should render form fields correctly', async () => {
    render(
      <WorkOrderCreateForm
        onCancel={mockOnCancel}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/工单标题/)).toBeInTheDocument();
      expect(screen.getByLabelText(/报修类别/)).toBeInTheDocument();
      expect(screen.getByLabelText(/报修原因/)).toBeInTheDocument();
      expect(screen.getByLabelText(/具体位置/)).toBeInTheDocument();
      expect(screen.getByText('优先级')).toBeInTheDocument();
      expect(screen.getByLabelText(/详细描述/)).toBeInTheDocument();
    });
  });

  it('should load form options from API', async () => {
    render(
      <WorkOrderCreateForm
        onCancel={mockOnCancel}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(workOrderService.getFormOptions).toHaveBeenCalled();
    });

    await waitFor(() => {
      // Check that categories are loaded
      expect(screen.getByRole('option', { name: '设备故障' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '预防性维护' })).toBeInTheDocument();
    });
  });

  it('should show validation errors for required fields', async () => {
    const user = userEvent.setup();

    render(
      <WorkOrderCreateForm
        onCancel={mockOnCancel}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '提交工单' })).toBeInTheDocument();
    });

    // Submit form without filling required fields
    await user.click(screen.getByRole('button', { name: '提交工单' }));

    await waitFor(() => {
      expect(screen.getByText('请输入工单标题')).toBeInTheDocument();
      expect(screen.getByText('请选择报修类别')).toBeInTheDocument();
      expect(screen.getByText('请选择报修原因')).toBeInTheDocument();
    });

    expect(mockCreateWorkOrder).not.toHaveBeenCalled();
  });

  it('should validate minimum title length', async () => {
    const user = userEvent.setup();

    render(
      <WorkOrderCreateForm
        onCancel={mockOnCancel}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/工单标题/)).toBeInTheDocument();
    });

    // Enter a title that's too short
    await user.type(screen.getByLabelText(/工单标题/), '短标题');
    await user.click(screen.getByRole('button', { name: '提交工单' }));

    await waitFor(() => {
      expect(screen.getByText('标题至少需要5个字符')).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    mockCreateWorkOrder.mockResolvedValue({ id: 'test-wo-1' });

    render(
      <WorkOrderCreateForm
        onCancel={mockOnCancel}
        onSuccess={mockOnSuccess}
      />
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/工单标题/)).toBeInTheDocument();
    });

    // Fill in the form
    await user.type(screen.getByLabelText(/工单标题/), '测试工单标题123456');
    
    await user.selectOptions(screen.getByLabelText(/报修类别/), '设备故障');
    await user.selectOptions(screen.getByLabelText(/报修原因/), '机械故障');
    
    await user.type(screen.getByLabelText(/具体位置/), '测试位置');
    await user.type(screen.getByLabelText(/详细描述/), '测试描述');

    // Submit the form
    await user.click(screen.getByRole('button', { name: '提交工单' }));

    await waitFor(() => {
      expect(mockCreateWorkOrder).toHaveBeenCalledWith({
        title: '测试工单标题123456',
        category: '设备故障',
        reason: '机械故障',
        location: '测试位置',
        priority: Priority.MEDIUM,
        description: '测试描述',
        photos: [],
      });
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('should show create error when submission fails', async () => {
    const mockError = 'Failed to create work order';
    
    // Mock store to return error state
    mockUseWorkOrderStore.mockReturnValue({
      createWorkOrder: mockCreateWorkOrder,
      creating: false,
      createError: mockError,
      clearCreateError: mockClearCreateError,
      assignedWorkOrders: [],
      currentWorkOrder: null,
      currentWorkOrderWithResolution: null,
      statusHistory: [],
      loading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      loadAssignedWorkOrders: jest.fn(),
      loadWorkOrderWithHistory: jest.fn(),
      loadWorkOrderWithResolution: jest.fn(),
      loadWorkOrderStatusHistory: jest.fn(),
      updateWorkOrderStatus: jest.fn(),
      completeWorkOrder: jest.fn(),
      uploadResolutionPhotos: jest.fn(),
      clearCurrentWorkOrder: jest.fn(),
      clearError: jest.fn(),
      setLoading: jest.fn(),
    });

    render(
      <WorkOrderCreateForm
        onCancel={mockOnCancel}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('创建工单失败')).toBeInTheDocument();
      expect(screen.getByText(mockError)).toBeInTheDocument();
    });
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <WorkOrderCreateForm
        onCancel={mockOnCancel}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '取消' }));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should handle location suggestions', async () => {
    const user = userEvent.setup();

    render(
      <WorkOrderCreateForm
        onCancel={mockOnCancel}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('生产车间A')).toBeInTheDocument();
    });

    // Click on a location suggestion
    await user.click(screen.getByText('生产车间A'));

    expect(screen.getByDisplayValue('生产车间A')).toBeInTheDocument();
  });

  it('should show creating state when submitting', async () => {
    // Mock store to return creating state
    mockUseWorkOrderStore.mockReturnValue({
      createWorkOrder: mockCreateWorkOrder,
      creating: true,
      createError: null,
      clearCreateError: mockClearCreateError,
      assignedWorkOrders: [],
      currentWorkOrder: null,
      currentWorkOrderWithResolution: null,
      statusHistory: [],
      loading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      loadAssignedWorkOrders: jest.fn(),
      loadWorkOrderWithHistory: jest.fn(),
      loadWorkOrderWithResolution: jest.fn(),
      loadWorkOrderStatusHistory: jest.fn(),
      updateWorkOrderStatus: jest.fn(),
      completeWorkOrder: jest.fn(),
      uploadResolutionPhotos: jest.fn(),
      clearCurrentWorkOrder: jest.fn(),
      clearError: jest.fn(),
      setLoading: jest.fn(),
    });

    render(
      <WorkOrderCreateForm
        onCancel={mockOnCancel}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('提交中...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /提交中/ })).toBeDisabled();
    });
  });
});