import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkOrderCreateModal } from '../WorkOrderCreateModal';

// Mock the WorkOrderCreateForm component
jest.mock('../WorkOrderCreateForm', () => ({
  WorkOrderCreateForm: ({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) => (
    <div data-testid="work-order-create-form">
      <button onClick={onCancel}>Cancel Form</button>
      <button onClick={onSuccess}>Success Form</button>
      Mock WorkOrderCreateForm
    </div>
  ),
}));

describe('WorkOrderCreateModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSuccess.mockClear();
  });

  it('should render modal when open', () => {
    render(
      <WorkOrderCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('创建维修工单')).toBeInTheDocument();
    expect(screen.getByTestId('work-order-create-form')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <WorkOrderCreateModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText('创建维修工单')).not.toBeInTheDocument();
    expect(screen.queryByTestId('work-order-create-form')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <WorkOrderCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const closeButton = screen.getByRole('button', { name: '' }); // SVG button
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();

    render(
      <WorkOrderCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Click on the backdrop (the modal overlay)
    const backdrop = screen.getByRole('dialog').parentElement;
    if (backdrop) {
      await user.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should not close when clicking inside modal content', async () => {
    const user = userEvent.setup();

    render(
      <WorkOrderCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Click inside the modal content
    const modalContent = screen.getByText('创建维修工单');
    await user.click(modalContent);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should pass onCancel correctly to form', async () => {
    const user = userEvent.setup();

    render(
      <WorkOrderCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Click the cancel button in the mocked form
    await user.click(screen.getByText('Cancel Form'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should pass onSuccess correctly to form', async () => {
    const user = userEvent.setup();

    render(
      <WorkOrderCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Click the success button in the mocked form
    await user.click(screen.getByText('Success Form'));

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('should have proper accessibility attributes', () => {
    render(
      <WorkOrderCreateModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // The modal should be properly labeled
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('创建维修工单')).toBeInTheDocument();
  });
});