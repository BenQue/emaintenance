import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { FormWrapper } from '../FormWrapper';

// Test component that uses FormWrapper
function TestFormComponent() {
  const form = useForm({
    defaultValues: {
      testField: ''
    }
  });

  const onSubmit = (data: any) => {
    console.log(data);
  };

  return (
    <FormWrapper
      form={form}
      onSubmit={onSubmit}
      title="Test Form"
      submitButtonText="Submit"
    >
      <div>Test Form Content</div>
    </FormWrapper>
  );
}

describe('FormWrapper', () => {
  it('renders form wrapper with title', () => {
    render(<TestFormComponent />);
    
    expect(screen.getByText('Test Form')).toBeInTheDocument();
    expect(screen.getByText('Test Form Content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('renders submit button with correct text', () => {
    render(<TestFormComponent />);
    
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveClass('bg-bizlink-500');
  });
});