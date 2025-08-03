import { render, screen } from '@testing-library/react';
import { CustomPieChart } from '../PieChart';
import { ChartData } from '../types';

// Mock Recharts components
jest.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data }: any) => <div data-testid="pie" data-entries={data.length} />,
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Legend: () => <div data-testid="legend" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('CustomPieChart', () => {
  const mockData: ChartData[] = [
    { name: '已完成', value: 30, color: '#00C49F' },
    { name: '进行中', value: 20, color: '#0088FE' },
    { name: '待处理', value: 15, color: '#FF8042' },
  ];

  it('renders pie chart with data', () => {
    render(<CustomPieChart data={mockData} title="工单状态分布" />);

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('displays title when provided', () => {
    const title = '工单状态分布';
    render(<CustomPieChart data={mockData} title={title} />);

    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it('shows legend when showLegend is true', () => {
    render(<CustomPieChart data={mockData} showLegend={true} />);

    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('does not show legend when showLegend is false', () => {
    render(<CustomPieChart data={mockData} showLegend={false} />);

    expect(screen.queryByTestId('legend')).not.toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<CustomPieChart data={[]} loading={true} />);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
  });

  it('displays error state', () => {
    const errorMessage = '数据加载失败';
    render(<CustomPieChart data={[]} error={errorMessage} />);

    expect(screen.getByText(`错误: ${errorMessage}`)).toBeInTheDocument();
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
  });

  it('displays no data message when data is empty', () => {
    render(<CustomPieChart data={[]} />);

    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
  });

  it('renders correct number of data entries', () => {
    render(<CustomPieChart data={mockData} />);

    const pieElement = screen.getByTestId('pie');
    expect(pieElement).toHaveAttribute('data-entries', '3');
  });

  it('renders cells for each data entry', () => {
    render(<CustomPieChart data={mockData} />);

    const cells = screen.getAllByTestId('cell');
    expect(cells).toHaveLength(mockData.length);
  });
});