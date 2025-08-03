import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KPIDashboard } from '../KPIDashboard';
import { workOrderService } from '../../../lib/services/work-order-service';
import { assetService } from '../../../lib/services/asset-service';

// Mock services
jest.mock('../../../lib/services/work-order-service');
jest.mock('../../../lib/services/asset-service');

const mockWorkOrderService = workOrderService as jest.Mocked<typeof workOrderService>;
const mockAssetService = assetService as jest.Mocked<typeof assetService>;

// Mock child components to focus on integration logic
jest.mock('../WorkOrderMetrics', () => ({
  WorkOrderMetrics: ({ statistics, trends, loading, error }: any) => (
    <div data-testid="work-order-metrics">
      {loading && <div>Loading work order metrics...</div>}
      {error && <div>Error in work order metrics: {error}</div>}
      {statistics && <div>Work order statistics loaded</div>}
      {trends && <div>Work order trends loaded</div>}
    </div>
  ),
}));

jest.mock('../TimeMetrics', () => ({
  TimeMetrics: ({ mttrData, loading, error }: any) => (
    <div data-testid="time-metrics">
      {loading && <div>Loading time metrics...</div>}
      {error && <div>Error in time metrics: {error}</div>}
      {mttrData && <div>MTTR data loaded</div>}
    </div>
  ),
}));

jest.mock('../AssetMetrics', () => ({
  AssetMetrics: ({ downtimeRanking, healthOverview, loading, error }: any) => (
    <div data-testid="asset-metrics">
      {loading && <div>Loading asset metrics...</div>}
      {error && <div>Error in asset metrics: {error}</div>}
      {downtimeRanking && <div>Asset downtime ranking loaded</div>}
      {healthOverview && <div>Asset health overview loaded</div>}
    </div>
  ),
}));

describe('KPIDashboard Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockWorkOrderService.getStatistics.mockResolvedValue({
      total: 100,
      byStatus: { PENDING: 10, IN_PROGRESS: 20, COMPLETED: 70 },
      byPriority: { LOW: 30, MEDIUM: 40, HIGH: 25, URGENT: 5 },
      averageResolutionTime: 24,
    });

    mockWorkOrderService.getWorkOrderTrends.mockResolvedValue({
      creationTrend: [
        { date: '2024-01-01', count: 5 },
        { date: '2024-01-02', count: 8 },
      ],
      completionTrend: [
        { date: '2024-01-01', count: 3 },
        { date: '2024-01-02', count: 6 },
      ],
    });

    mockWorkOrderService.getMTTRStatistics.mockResolvedValue({
      averageMTTR: 12.5,
      mttrTrend: [
        { period: '2024-W01', mttr: 14 },
        { period: '2024-W02', mttr: 11 },
      ],
      byPriority: [
        { priority: 'HIGH', mttr: 8 },
        { priority: 'MEDIUM', mttr: 16 },
      ],
    });

    mockAssetService.getDowntimeRanking.mockResolvedValue([
      {
        assetCode: 'EQ001',
        assetName: 'Equipment 1',
        totalDowntimeHours: 48,
        downtimeIncidents: 3,
      },
    ]);

    mockAssetService.getFaultFrequencyRanking.mockResolvedValue([
      {
        assetCode: 'EQ002',
        assetName: 'Equipment 2',
        faultFrequency: 8,
        healthScore: 65,
      },
    ]);

    mockAssetService.getMaintenanceCostAnalysis.mockResolvedValue([
      {
        assetCode: 'EQ003',
        assetName: 'Equipment 3',
        maintenanceCost: 15000,
      },
    ]);

    mockAssetService.getHealthOverview.mockResolvedValue({
      totalAssets: 50,
      activeAssets: 45,
      assetsWithIssues: 8,
      averageHealthScore: 78,
    });
  });

  it('renders KPI dashboard with all components', async () => {
    render(<KPIDashboard />);

    expect(screen.getByText('KPI 仪表板')).toBeInTheDocument();
    expect(screen.getByTestId('work-order-metrics')).toBeInTheDocument();
    expect(screen.getByTestId('time-metrics')).toBeInTheDocument();
    expect(screen.getByTestId('asset-metrics')).toBeInTheDocument();
  });

  it('loads all KPI data on initial render', async () => {
    render(<KPIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Work order statistics loaded')).toBeInTheDocument();
      expect(screen.getByText('Work order trends loaded')).toBeInTheDocument();
      expect(screen.getByText('MTTR data loaded')).toBeInTheDocument();
      expect(screen.getByText('Asset downtime ranking loaded')).toBeInTheDocument();
      expect(screen.getByText('Asset health overview loaded')).toBeInTheDocument();
    });

    // Verify all service methods were called
    expect(mockWorkOrderService.getStatistics).toHaveBeenCalledWith({ timeRange: 'month' });
    expect(mockWorkOrderService.getWorkOrderTrends).toHaveBeenCalledWith({
      timeRange: 'month',
      granularity: 'day',
    });
    expect(mockWorkOrderService.getMTTRStatistics).toHaveBeenCalledWith({
      timeRange: 'month',
      granularity: 'week',
    });
    expect(mockAssetService.getDowntimeRanking).toHaveBeenCalledWith({
      timeRange: 'month',
      limit: 5,
    });
  });

  it('shows loading state while fetching data', () => {
    render(<KPIDashboard />);

    expect(screen.getByText('Loading work order metrics...')).toBeInTheDocument();
    expect(screen.getByText('Loading time metrics...')).toBeInTheDocument();
    expect(screen.getByText('Loading asset metrics...')).toBeInTheDocument();
  });

  it('handles errors gracefully', async () => {
    const errorMessage = 'Failed to fetch data';
    mockWorkOrderService.getStatistics.mockRejectedValue(new Error(errorMessage));

    render(<KPIDashboard />);

    await waitFor(() => {
      expect(screen.getByText('加载 KPI 数据时出错')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('refreshes data when time filter changes', async () => {
    render(<KPIDashboard />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockWorkOrderService.getStatistics).toHaveBeenCalledWith({ timeRange: 'month' });
    });

    // Change time filter
    const timeFilterSelect = screen.getByDisplayValue('最近一月');
    fireEvent.change(timeFilterSelect, { target: { value: 'week' } });

    await waitFor(() => {
      expect(mockWorkOrderService.getStatistics).toHaveBeenCalledWith({ timeRange: 'week' });
    });
  });

  it('manually refreshes data when refresh button is clicked', async () => {
    render(<KPIDashboard />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(1);
    });

    // Click refresh button
    const refreshButton = screen.getByText('刷新');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(2);
    });
  });

  it('shows auto-refresh indicator when enabled', () => {
    render(<KPIDashboard autoRefresh={true} refreshInterval={30} />);

    expect(screen.getByText('自动刷新已启用 (每 30 秒)')).toBeInTheDocument();
  });

  it('does not show auto-refresh indicator when disabled', () => {
    render(<KPIDashboard autoRefresh={false} />);

    expect(screen.queryByText(/自动刷新已启用/)).not.toBeInTheDocument();
  });

  it('updates last refresh timestamp', async () => {
    render(<KPIDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/最后更新:/)).toBeInTheDocument();
    });

    // The exact timestamp will vary, so we just check that it exists
    const timestampElement = screen.getByText(/最后更新:/);
    expect(timestampElement).toBeInTheDocument();
  });

  it('handles partial data loading correctly', async () => {
    // Mock some services to fail
    mockAssetService.getHealthOverview.mockRejectedValue(new Error('Asset service unavailable'));

    render(<KPIDashboard />);

    await waitFor(() => {
      // Should still show other components that loaded successfully
      expect(screen.getByText('Work order statistics loaded')).toBeInTheDocument();
      expect(screen.getByText('MTTR data loaded')).toBeInTheDocument();
      
      // But should show error for the failed service
      expect(screen.getByText('加载 KPI 数据时出错')).toBeInTheDocument();
    });
  });

  it('retries data fetch when retry button is clicked', async () => {
    mockWorkOrderService.getStatistics.mockRejectedValueOnce(new Error('Network error'));
    mockWorkOrderService.getStatistics.mockResolvedValueOnce({
      total: 100,
      byStatus: {},
      byPriority: {},
      averageResolutionTime: 24,
    });

    render(<KPIDashboard />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('重试')).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByText('重试'));

    // Should attempt to load data again
    await waitFor(() => {
      expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(2);
    });
  });
});