import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple test component to verify setup
function SimpleComponent({ title }: { title: string }) {
  return <div>{title}</div>;
}

describe('SimpleComponent Test', () => {
  it('renders text correctly', () => {
    render(<SimpleComponent title="Test Component" />);
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });
});

describe('Basic Jest Setup', () => {
  it('should have working test environment', () => {
    expect(true).toBe(true);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('async test');
    expect(result).toBe('async test');
  });
});