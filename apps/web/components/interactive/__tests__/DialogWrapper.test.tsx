import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DialogWrapper } from '../dialogs/DialogWrapper';
import { Button } from '../../ui/button';

describe('DialogWrapper', () => {
  it('renders trigger button', () => {
    render(
      <DialogWrapper
        trigger={<Button>Open Dialog</Button>}
        title="Test Dialog"
      >
        <p>Dialog content</p>
      </DialogWrapper>
    );

    expect(screen.getByText('Open Dialog')).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', () => {
    render(
      <DialogWrapper
        trigger={<Button>Open Dialog</Button>}
        title="Test Dialog"
      >
        <p>Dialog content</p>
      </DialogWrapper>
    );

    const trigger = screen.getByText('Open Dialog');
    fireEvent.click(trigger);

    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog content')).toBeInTheDocument();
  });

  it('can be controlled externally', () => {
    const mockOnOpenChange = jest.fn();
    
    render(
      <DialogWrapper
        trigger={<Button>Open Dialog</Button>}
        title="Test Dialog"
        open={true}
        onOpenChange={mockOnOpenChange}
      >
        <p>Dialog content</p>
      </DialogWrapper>
    );

    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <DialogWrapper
        trigger={<Button>Open Dialog</Button>}
        title="Test Dialog"
        open={true}
        className="custom-dialog"
      >
        <p>Dialog content</p>
      </DialogWrapper>
    );

    const dialogContent = screen.getByText('Test Dialog').closest('[data-slot="dialog-content"]');
    expect(dialogContent).toHaveClass('custom-dialog');
  });

  it('displays close button by default', () => {
    render(
      <DialogWrapper
        trigger={<Button>Open Dialog</Button>}
        title="Test Dialog"
        open={true}
      >
        <p>Dialog content</p>
      </DialogWrapper>
    );

    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });
});