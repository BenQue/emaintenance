import { render, screen, waitFor, act } from '@testing-library/react';
import { KPIDashboard } from '../KPIDashboard';
import { workOrderService } from '../../../lib/services/work-order-service';
import { assetService } from '../../../lib/services/asset-service';

// Mock services
jest.mock('../../../lib/services/work-order-service');
jest.mock('../../../lib/services/asset-service');

const mockWorkOrderService = workOrderService as jest.Mocked<typeof workOrderService>;
const mockAssetService = assetService as jest.Mocked<typeof assetService>;

// Mock child components
jest.mock('../WorkOrderMetrics', () => ({
  WorkOrderMetrics: ({ statistics }: any) => (
    <div data-testid="work-order-metrics">
      {statistics && <div>Statistics: {statistics.total}</div>}
    </div>
  ),
}));

jest.mock('../TimeMetrics', () => ({
  TimeMetrics: () => <div data-testid="time-metrics" />,
}));

jest.mock('../AssetMetrics', () => ({
  AssetMetrics: () => <div data-testid="asset-metrics" />,
}));

describe('KPIDashboard Real-time Updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup mock responses with different data for each call
    let callCount = 0;
    mockWorkOrderService.getStatistics.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        total: 100 + callCount * 10, // Simulate changing data
        byStatus: { PENDING: 10, IN_PROGRESS: 20, COMPLETED: 70 },
        byPriority: { LOW: 30, MEDIUM: 40, HIGH: 25, URGENT: 5 },
        averageResolutionTime: 24,
      });
    });

    mockWorkOrderService.getWorkOrderTrends.mockResolvedValue({
      creationTrend: [],
      completionTrend: [],
    });

    mockWorkOrderService.getMTTRStatistics.mockResolvedValue({
      averageMTTR: 12.5,
      mttrTrend: [],
      byPriority: [],
    });

    mockAssetService.getDowntimeRanking.mockResolvedValue([]);
    mockAssetService.getFaultFrequencyRanking.mockResolvedValue([]);
    mockAssetService.getMaintenanceCostAnalysis.mockResolvedValue([]);
    mockAssetService.getHealthOverview.mockResolvedValue({
      totalAssets: 50,
      activeAssets: 45,
      assetsWithIssues: 8,
      averageHealthScore: 78,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('automatically refreshes data at specified intervals', async () => {
    const refreshInterval = 30; // 30 seconds
    
    render(<KPIDashboard autoRefresh={true} refreshInterval={refreshInterval} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Statistics: 110')).toBeInTheDocument();
    });

    expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(1);

    // Advance time by refresh interval
    act(() => {
      jest.advanceTimersByTime(refreshInterval * 1000);
    });

    // Wait for the refresh to complete
    await waitFor(() => {
      expect(screen.getByText('Statistics: 120')).toBeInTheDocument();
    });

    expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(2);

    // Advance time again
    act(() => {
      jest.advanceTimersByTime(refreshInterval * 1000);
    });

    await waitFor(() => {
      expect(screen.getByText('Statistics: 130')).toBeInTheDocument();
    });

    expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(3);
  });

  it('does not auto-refresh when disabled', async () => {
    render(<KPIDashboard autoRefresh={false} refreshInterval={30} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Statistics: 110')).toBeInTheDocument();
    });

    expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(1);

    // Advance time
    act(() => {
      jest.advanceTimersByTime(30 * 1000);
    });

    // Should not refresh
    expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Statistics: 110')).toBeInTheDocument();
  });

  it('respects custom refresh intervals', async () => {
    const customInterval = 60; // 60 seconds
    
    render(<KPIDashboard autoRefresh={true} refreshInterval={customInterval} />);

    await waitFor(() => {
      expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(1);
    });

    // Advance by less than the interval - should not refresh
    act(() => {
      jest.advanceTimersByTime(30 * 1000);
    });

    expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(1);

    // Advance to the full interval - should refresh
    act(() => {
      jest.advanceTimersByTime(30 * 1000);
    });

    await waitFor(() => {
      expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(2);
    });
  });

  it('updates last refresh timestamp on each refresh', async () => {
    render(<KPIDashboard autoRefresh={true} refreshInterval={30} />);

    // Get initial timestamp
    await waitFor(() => {
      expect(screen.getByText(/最后更新:/)).toBeInTheDocument();
    });

    const initialTimestamp = screen.getByText(/最后更新:/).textContent;

    // Wait a bit and trigger refresh
    act(() => {
      jest.advanceTimersByTime(1000); // Advance 1 second
    });

    act(() => {
      jest.advanceTimersByTime(30 * 1000); // Trigger refresh
    });

    await waitFor(() => {
      expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(2);
    });

    // Timestamp should be updated
    const updatedTimestamp = screen.getByText(/最后更新:/).textContent;
    expect(updatedTimestamp).not.toBe(initialTimestamp);
  });

  it('continues auto-refresh after manual refresh', async () => {
    render(<KPIDashboard autoRefresh={true} refreshInterval={30} />);

    await waitFor(() => {
      expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(1);
    });

    // Manual refresh
    const refreshButton = screen.getByText('刷新');
    act(() => {
      refreshButton.click();
    });

    await waitFor(() => {
      expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(2);
    });

    // Auto-refresh should still work
    act(() => {
      jest.advanceTimersByTime(30 * 1000);
    });

    await waitFor(() => {
      expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(3);
    });
  });

  it('handles errors during auto-refresh gracefully', async () => {
    let callCount = 0;
    mockWorkOrderService.getStatistics.mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        total: 100 + callCount * 10,
        byStatus: {},
        byPriority: {},
        averageResolutionTime: 24,
      });
    });

    render(<KPIDashboard autoRefresh={true} refreshInterval={30} />);

    // Initial load should succeed
    await waitFor(() => {
      expect(screen.getByText('Statistics: 110')).toBeInTheDocument();
    });

    // Second refresh should fail
    act(() => {
      jest.advanceTimersByTime(30 * 1000);
    });

    await waitFor(() => {
      expect(screen.getByText('加载 KPI 数据时出错')).toBeInTheDocument();
    });

    // Third refresh should succeed
    act(() => {
      jest.advanceTimersByTime(30 * 1000);
    });

    await waitFor(() => {
      expect(screen.getByText('Statistics: 140')).toBeInTheDocument();
    });
  });

  it('clears auto-refresh interval on unmount', async () => {
    const { unmount } = render(<KPIDashboard autoRefresh={true} refreshInterval={30} />);

    await waitFor(() => {
      expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(1);
    });

    unmount();

    // Advance time - should not trigger more calls
    act(() => {
      jest.advanceTimersByTime(30 * 1000);
    });

    expect(mockWorkOrderService.getStatistics).toHaveBeenCalledTimes(1);
  });

  it('displays auto-refresh status correctly', () => {
    const { rerender } = render(<KPIDashboard autoRefresh={true} refreshInterval={45} />);

    expect(screen.getByText('自动刷新已启用 (每 45 秒)')).toBeInTheDocument();

    rerender(<KPIDashboard autoRefresh={false} refreshInterval={45} />);

    expect(screen.queryByText(/自动刷新已启用/)).not.toBeInTheDocument();
  });
});