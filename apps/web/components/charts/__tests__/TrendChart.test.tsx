import { render, screen } from '@testing-library/react';
import { TrendChart } from '../TrendChart';
import { TrendData } from '../types';

// Mock Recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: ({ dataKey, stroke }: any) => <div data-testid="line" data-key={dataKey} data-stroke={stroke} />,
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('TrendChart', () => {
  const mockData: TrendData[] = [
    { date: '2024-01-01', value: 10 },
    { date: '2024-01-02', value: 15 },
    { date: '2024-01-03', value: 8 },
    { date: '2024-01-04', value: 20 },
  ];

  it('renders trend chart with data', () => {
    render(<TrendChart data={mockData} title="工单创建趋势" />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('displays title when provided', () => {
    const title = '工单创建趋势';
    render(<TrendChart data={mockData} title={title} />);

    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it('uses correct axis keys', () => {
    render(
      <TrendChart 
        data={mockData} 
        xAxisKey="date" 
        yAxisKey="value" 
      />
    );

    const xAxis = screen.getByTestId('x-axis');
    const line = screen.getByTestId('line');
    
    expect(xAxis).toHaveAttribute('data-key', 'date');
    expect(line).toHaveAttribute('data-key', 'value');
  });

  it('uses custom line color', () => {
    const customColor = '#FF6B6B';
    render(<TrendChart data={mockData} lineColor={customColor} />);

    const line = screen.getByTestId('line');
    expect(line).toHaveAttribute('data-stroke', customColor);
  });

  it('displays loading state', () => {
    render(<TrendChart data={[]} loading={true} />);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('displays error state', () => {
    const errorMessage = '数据获取失败';
    render(<TrendChart data={[]} error={errorMessage} />);

    expect(screen.getByText(`错误: ${errorMessage}`)).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('displays no data message when data is empty', () => {
    render(<TrendChart data={[]} />);

    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('uses default axis keys when not specified', () => {
    render(<TrendChart data={mockData} />);

    const xAxis = screen.getByTestId('x-axis');
    const line = screen.getByTestId('line');
    
    expect(xAxis).toHaveAttribute('data-key', 'date');
    expect(line).toHaveAttribute('data-key', 'value');
  });

  it('uses default line color when not specified', () => {
    render(<TrendChart data={mockData} />);

    const line = screen.getByTestId('line');
    expect(line).toHaveAttribute('data-stroke', '#8884d8');
  });
});