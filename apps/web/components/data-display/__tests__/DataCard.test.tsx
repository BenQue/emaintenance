import { render, screen } from '@testing-library/react';
import { DataCard } from '../cards/DataCard';
import { Activity } from 'lucide-react';

describe('DataCard', () => {
  it('renders basic card with title and value', () => {
    render(
      <DataCard
        title="Test Metric"
        value="123"
        subtitle="Test description"
      />
    );

    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(
      <DataCard
        title="Test Metric"
        value="123"
        isLoading={true}
      />
    );

    expect(screen.queryByText('Test Metric')).not.toBeInTheDocument();
  });

  it('renders error state', () => {
    render(
      <DataCard
        title="Test Metric"
        value="123"
        error="Test error"
      />
    );

    expect(screen.getByText('加载失败')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders with progress bar when enabled', () => {
    render(
      <DataCard
        title="Test Metric"
        value="75"
        showProgress={true}
        progressValue={75}
      />
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders with icon and variant styling', () => {
    render(
      <DataCard
        title="Test Metric"
        value="123"
        icon={Activity}
        variant="success"
      />
    );

    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });
});