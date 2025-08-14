import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusUpdateForm } from '../StatusUpdateForm';
import { useWorkOrderStore } from '../../../lib/stores/work-order-store';
import { WorkOrderStatus } from '../../../lib/types/work-order';

// Mock the store
jest.mock('../../../lib/stores/work-order-store');
const mockUseWorkOrderStore = useWorkOrderStore as jest.MockedFunction<typeof useWorkOrderStore>;

describe('StatusUpdateForm', () => {
  const defaultProps = {
    workOrderId: 'wo-123',
    currentStatus: WorkOrderStatus.PENDING,
  };

  const defaultMockStore = {
    updateWorkOrderStatus: jest.fn(),
    loading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkOrderStore.mockReturnValue(defaultMockStore);
  });

  it('renders current status correctly', () => {
    render(<StatusUpdateForm {...defaultProps} />);

    expect(screen.getByText('状态更新')).toBeInTheDocument();
    expect(screen.getByText('当前状态')).toBeInTheDocument();
    expect(screen.getByText('待处理')).toBeInTheDocument();
  });

  it('shows available status transitions for PENDING status', () => {
    render(<StatusUpdateForm {...defaultProps} />);

    const statusSelect = screen.getByRole('combobox');
    expect(statusSelect).toBeInTheDocument();

    // Check that available options are present
    expect(screen.getByText('待处理 (不变更)')).toBeInTheDocument();
    
    // Open select to see options
    fireEvent.click(statusSelect);
    
    // Check for valid transitions from PENDING
    const inProgressOption = screen.getByRole('option', { name: /进行中/ });
    const cancelledOption = screen.getByRole('option', { name: /已取消/ });
    
    expect(inProgressOption).toBeInTheDocument();
    expect(cancelledOption).toBeInTheDocument();
  });

  it('shows available status transitions for IN_PROGRESS status', () => {
    const inProgressProps = {
      ...defaultProps,
      currentStatus: WorkOrderStatus.IN_PROGRESS,
    };

    render(<StatusUpdateForm {...inProgressProps} />);

    const statusSelect = screen.getByRole('combobox');
    fireEvent.click(statusSelect);

    // Check for valid transitions from IN_PROGRESS (COMPLETED removed - handled by dedicated completion workflow)
    expect(screen.getByRole('option', { name: /等待备件/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /等待外部/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /已取消/ })).toBeInTheDocument();
    
    // Ensure COMPLETED status is NOT available in regular status updates
    expect(screen.queryByRole('option', { name: /已完成/ })).not.toBeInTheDocument();
  });

  it('shows no transitions available for COMPLETED status', () => {
    const completedProps = {
      ...defaultProps,
      currentStatus: WorkOrderStatus.COMPLETED,
    };

    render(<StatusUpdateForm {...completedProps} />);

    expect(screen.getByText('当前状态无法进行变更')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows no transitions available for CANCELLED status', () => {
    const cancelledProps = {
      ...defaultProps,
      currentStatus: WorkOrderStatus.CANCELLED,
    };

    render(<StatusUpdateForm {...cancelledProps} />);

    expect(screen.getByText('当前状态无法进行变更')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('handles status selection and notes input', async () => {
    const user = userEvent.setup();
    render(<StatusUpdateForm {...defaultProps} />);

    // Select new status
    const statusSelect = screen.getByRole('combobox');
    await user.selectOptions(statusSelect, WorkOrderStatus.IN_PROGRESS);

    // Add notes
    const notesTextarea = screen.getByPlaceholderText('请输入状态变更的备注说明...');
    await user.type(notesTextarea, '开始维修工作');

    expect(notesTextarea).toHaveValue('开始维修工作');
    expect(screen.getByText('6/500 字符')).toBeInTheDocument();
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    const mockUpdateWorkOrderStatus = jest.fn().mockResolvedValue(undefined);
    const mockOnSuccess = jest.fn();

    mockUseWorkOrderStore.mockReturnValue({
      ...defaultMockStore,
      updateWorkOrderStatus: mockUpdateWorkOrderStatus,
    });

    render(
      <StatusUpdateForm {...defaultProps} onSuccess={mockOnSuccess} />
    );

    // Select new status
    const statusSelect = screen.getByRole('combobox');
    await user.selectOptions(statusSelect, WorkOrderStatus.IN_PROGRESS);

    // Add notes
    const notesTextarea = screen.getByPlaceholderText('请输入状态变更的备注说明...');
    await user.type(notesTextarea, '开始维修');

    // Submit form
    const submitButton = screen.getByText('更新状态');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateWorkOrderStatus).toHaveBeenCalledWith('wo-123', {
        status: WorkOrderStatus.IN_PROGRESS,
        notes: '开始维修',
      });
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('does not submit when status is unchanged', async () => {
    const user = userEvent.setup();
    const mockUpdateWorkOrderStatus = jest.fn();

    mockUseWorkOrderStore.mockReturnValue({
      ...defaultMockStore,
      updateWorkOrderStatus: mockUpdateWorkOrderStatus,
    });

    render(<StatusUpdateForm {...defaultProps} />);

    // Don't change status, try to submit
    const submitButton = screen.getByText('更新状态');
    await user.click(submitButton);

    expect(mockUpdateWorkOrderStatus).not.toHaveBeenCalled();
  });

  it('disables submit button when status is unchanged', () => {
    render(<StatusUpdateForm {...defaultProps} />);

    const submitButton = screen.getByText('更新状态');
    expect(submitButton).toBeDisabled();
  });

  it('shows loading state during submission', () => {
    mockUseWorkOrderStore.mockReturnValue({
      ...defaultMockStore,
      loading: true,
    });

    render(<StatusUpdateForm {...defaultProps} />);

    expect(screen.getByText('更新中...')).toBeInTheDocument();
    
    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeDisabled();
  });

  it('displays error message when there is an error', () => {
    const errorMessage = '更新状态失败';
    mockUseWorkOrderStore.mockReturnValue({
      ...defaultMockStore,
      error: errorMessage,
    });

    render(<StatusUpdateForm {...defaultProps} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('clears notes after successful submission', async () => {
    const user = userEvent.setup();
    const mockUpdateWorkOrderStatus = jest.fn().mockResolvedValue(undefined);

    mockUseWorkOrderStore.mockReturnValue({
      ...defaultMockStore,
      updateWorkOrderStatus: mockUpdateWorkOrderStatus,
    });

    render(<StatusUpdateForm {...defaultProps} />);

    // Select status and add notes
    const statusSelect = screen.getByRole('combobox');
    await user.selectOptions(statusSelect, WorkOrderStatus.IN_PROGRESS);

    const notesTextarea = screen.getByPlaceholderText('请输入状态变更的备注说明...');
    await user.type(notesTextarea, '测试备注');

    // Submit form
    const submitButton = screen.getByText('更新状态');
    await user.click(submitButton);

    await waitFor(() => {
      expect(notesTextarea).toHaveValue('');
    });
  });

  it('enforces maximum character limit for notes', async () => {
    const user = userEvent.setup();
    render(<StatusUpdateForm {...defaultProps} />);

    const notesTextarea = screen.getByPlaceholderText('请输入状态变更的备注说明...');
    expect(notesTextarea).toHaveAttribute('maxLength', '500');
  });

  it('updates character count as user types', async () => {
    const user = userEvent.setup();
    render(<StatusUpdateForm {...defaultProps} />);

    const notesTextarea = screen.getByPlaceholderText('请输入状态变更的备注说明...');
    await user.type(notesTextarea, 'Hello');

    expect(screen.getByText('5/500 字符')).toBeInTheDocument();
  });

  it('submits without notes when notes is empty', async () => {
    const user = userEvent.setup();
    const mockUpdateWorkOrderStatus = jest.fn().mockResolvedValue(undefined);

    mockUseWorkOrderStore.mockReturnValue({
      ...defaultMockStore,
      updateWorkOrderStatus: mockUpdateWorkOrderStatus,
    });

    render(<StatusUpdateForm {...defaultProps} />);

    // Select new status without adding notes
    const statusSelect = screen.getByRole('combobox');
    await user.selectOptions(statusSelect, WorkOrderStatus.IN_PROGRESS);

    // Submit form
    const submitButton = screen.getByText('更新状态');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateWorkOrderStatus).toHaveBeenCalledWith('wo-123', {
        status: WorkOrderStatus.IN_PROGRESS,
        notes: undefined,
      });
    });
  });

  it('handles form submission errors gracefully', async () => {
    const user = userEvent.setup();
    const mockUpdateWorkOrderStatus = jest.fn().mockRejectedValue(new Error('Update failed'));

    mockUseWorkOrderStore.mockReturnValue({
      ...defaultMockStore,
      updateWorkOrderStatus: mockUpdateWorkOrderStatus,
    });

    render(<StatusUpdateForm {...defaultProps} />);

    // Select status and submit
    const statusSelect = screen.getByRole('combobox');
    await user.selectOptions(statusSelect, WorkOrderStatus.IN_PROGRESS);

    const submitButton = screen.getByText('更新状态');
    await user.click(submitButton);

    // Error should be handled by the store, no unhandled promise rejection
    await waitFor(() => {
      expect(mockUpdateWorkOrderStatus).toHaveBeenCalled();
    });
  });
});