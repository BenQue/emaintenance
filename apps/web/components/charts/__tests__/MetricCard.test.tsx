import { render, screen } from '@testing-library/react';
import { MetricCard } from '../MetricCard';
import { MetricCardData } from '../types';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  ArrowUp: ({ className }: any) => <div data-testid="arrow-up" className={className} />,
  ArrowDown: ({ className }: any) => <div data-testid="arrow-down" className={className} />,
  Minus: ({ className }: any) => <div data-testid="minus" className={className} />,
}));

describe('MetricCard', () => {
  const baseMockData: MetricCardData = {
    title: '平均故障修复时间',
    value: '4.5',
    unit: '小时',
    description: '从故障报告到修复完成的平均时间',
  };

  it('renders metric card with basic data', () => {
    render(<MetricCard data={baseMockData} />);

    expect(screen.getByText('平均故障修复时间')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('小时')).toBeInTheDocument();
    expect(screen.getByText('从故障报告到修复完成的平均时间')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<MetricCard data={baseMockData} loading={true} />);

    expect(screen.getByText('平均故障修复时间')).toBeInTheDocument();
    expect(screen.queryByText('4.5')).not.toBeInTheDocument();
    
    // Check for loading skeleton elements
    const skeletonElements = screen.container.querySelectorAll('.animate-pulse .bg-gray-200');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('displays error state', () => {
    const errorMessage = '数据加载失败';
    render(<MetricCard data={baseMockData} error={errorMessage} />);

    expect(screen.getByText(`错误: ${errorMessage}`)).toBeInTheDocument();
    expect(screen.queryByText('4.5')).not.toBeInTheDocument();
  });

  it('renders without unit when not provided', () => {
    const dataWithoutUnit = { ...baseMockData };
    delete dataWithoutUnit.unit;
    
    render(<MetricCard data={dataWithoutUnit} />);

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.queryByText('小时')).not.toBeInTheDocument();
  });

  it('renders without description when not provided', () => {
    const dataWithoutDescription = { ...baseMockData };
    delete dataWithoutDescription.description;
    
    render(<MetricCard data={dataWithoutDescription} />);

    expect(screen.getByText('平均故障修复时间')).toBeInTheDocument();
    expect(screen.queryByText('从故障报告到修复完成的平均时间')).not.toBeInTheDocument();
  });

  describe('trend indicators', () => {
    it('displays up trend correctly', () => {
      const dataWithUpTrend: MetricCardData = {
        ...baseMockData,
        trend: {
          direction: 'up',
          percentage: 15,
        },
      };

      render(<MetricCard data={dataWithUpTrend} />);

      expect(screen.getByTestId('arrow-up')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
      
      const trendContainer = screen.getByTestId('arrow-up').parentElement;
      expect(trendContainer).toHaveClass('text-green-500');
    });

    it('displays down trend correctly', () => {
      const dataWithDownTrend: MetricCardData = {
        ...baseMockData,
        trend: {
          direction: 'down',
          percentage: 10,
        },
      };

      render(<MetricCard data={dataWithDownTrend} />);

      expect(screen.getByTestId('arrow-down')).toBeInTheDocument();
      expect(screen.getByText('10%')).toBeInTheDocument();
      
      const trendContainer = screen.getByTestId('arrow-down').parentElement;
      expect(trendContainer).toHaveClass('text-red-500');
    });

    it('displays stable trend correctly', () => {
      const dataWithStableTrend: MetricCardData = {
        ...baseMockData,
        trend: {
          direction: 'stable',
          percentage: 0,
        },
      };

      render(<MetricCard data={dataWithStableTrend} />);

      expect(screen.getByTestId('minus')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
      
      const trendContainer = screen.getByTestId('minus').parentElement;
      expect(trendContainer).toHaveClass('text-gray-500');
    });

    it('does not display trend when not provided', () => {
      render(<MetricCard data={baseMockData} />);

      expect(screen.queryByTestId('arrow-up')).not.toBeInTheDocument();
      expect(screen.queryByTestId('arrow-down')).not.toBeInTheDocument();
      expect(screen.queryByTestId('minus')).not.toBeInTheDocument();
    });
  });

  it('handles numeric values correctly', () => {
    const dataWithNumericValue: MetricCardData = {
      title: '设备总数',
      value: 150,
      description: '系统中的设备总数量',
    };

    render(<MetricCard data={dataWithNumericValue} />);

    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<MetricCard data={baseMockData} />);

    const cardElement = screen.getByText('平均故障修复时间').closest('.bg-white');
    expect(cardElement).toHaveClass('rounded-lg', 'border', 'p-6', 'shadow-sm');
  });
});