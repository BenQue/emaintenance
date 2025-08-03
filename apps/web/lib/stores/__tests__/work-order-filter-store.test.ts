import { act, renderHook } from '@testing-library/react';
import { useWorkOrderFilterStore } from '../work-order-filter-store';

// Mock zustand persist middleware
jest.mock('zustand/middleware', () => ({
  persist: (fn: any) => fn,
}));

describe('useWorkOrderFilterStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useWorkOrderFilterStore());
    act(() => {
      result.current.resetFilters();
    });
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useWorkOrderFilterStore());
    
    expect(result.current.filters).toEqual({
      sortBy: 'reportedAt',
      sortOrder: 'desc',
    });
    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.showAdvancedFilters).toBe(false);
    expect(result.current.filterOptions).toBe(null);
  });

  it('sets individual filter', () => {
    const { result } = renderHook(() => useWorkOrderFilterStore());
    
    act(() => {
      result.current.setFilter('status', 'PENDING');
    });
    
    expect(result.current.filters.status).toBe('PENDING');
    expect(result.current.currentPage).toBe(1); // Should reset to page 1
  });

  it('sets multiple filters', () => {
    const { result } = renderHook(() => useWorkOrderFilterStore());
    
    act(() => {
      result.current.setFilters({
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        search: '测试',
      });
    });
    
    expect(result.current.filters).toEqual({
      sortBy: 'reportedAt',
      sortOrder: 'desc',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      search: '测试',
    });
    expect(result.current.currentPage).toBe(1);
  });

  it('clears filters', () => {
    const { result } = renderHook(() => useWorkOrderFilterStore());
    
    // Set some filters first
    act(() => {
      result.current.setFilters({
        status: 'PENDING',
        priority: 'HIGH',
        search: '测试',
      });
    });
    
    // Clear filters
    act(() => {
      result.current.clearFilters();
    });
    
    expect(result.current.filters).toEqual({
      sortBy: 'reportedAt',
      sortOrder: 'desc',
    });
    expect(result.current.currentPage).toBe(1);
  });

  it('resets filters completely', () => {
    const { result } = renderHook(() => useWorkOrderFilterStore());
    
    // Set some state
    act(() => {
      result.current.setFilters({ status: 'PENDING' });
      result.current.setPage(3);
      result.current.toggleAdvancedFilters();
    });
    
    // Reset everything
    act(() => {
      result.current.resetFilters();
    });
    
    expect(result.current.filters).toEqual({
      sortBy: 'reportedAt',
      sortOrder: 'desc',
    });
    expect(result.current.currentPage).toBe(1);
    expect(result.current.showAdvancedFilters).toBe(false);
  });

  it('sets page and page size', () => {
    const { result } = renderHook(() => useWorkOrderFilterStore());
    
    act(() => {
      result.current.setPage(3);
      result.current.setPageSize(50);
    });
    
    expect(result.current.currentPage).toBe(3);
    expect(result.current.pageSize).toBe(50);
  });

  it('sets loading and error states', () => {
    const { result } = renderHook(() => useWorkOrderFilterStore());
    
    act(() => {
      result.current.setLoading(true);
      result.current.setError('测试错误');
    });
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe('测试错误');
  });

  it('toggles advanced filters', () => {
    const { result } = renderHook(() => useWorkOrderFilterStore());
    
    expect(result.current.showAdvancedFilters).toBe(false);
    
    act(() => {
      result.current.toggleAdvancedFilters();
    });
    
    expect(result.current.showAdvancedFilters).toBe(true);
    
    act(() => {
      result.current.toggleAdvancedFilters();
    });
    
    expect(result.current.showAdvancedFilters).toBe(false);
  });

  it('generates query params correctly', () => {
    const { result } = renderHook(() => useWorkOrderFilterStore());
    
    act(() => {
      result.current.setFilters({
        status: 'PENDING',
        priority: 'HIGH',
        search: '测试搜索',
      });
      result.current.setPage(2);
      result.current.setPageSize(50);
    });
    
    const params = result.current.getFilterQueryParams();
    
    expect(params.get('status')).toBe('PENDING');
    expect(params.get('priority')).toBe('HIGH');
    expect(params.get('search')).toBe('测试搜索');
    expect(params.get('sortBy')).toBe('reportedAt');
    expect(params.get('sortOrder')).toBe('desc');
    expect(params.get('page')).toBe('2');
    expect(params.get('limit')).toBe('50');
  });

  it('sets filters from URL params', () => {
    const { result } = renderHook(() => useWorkOrderFilterStore());
    
    const searchParams = new URLSearchParams({
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      search: 'URL搜索',
      page: '3',
      limit: '30',
    });
    
    act(() => {
      result.current.setFiltersFromUrl(searchParams);
    });
    
    expect(result.current.filters.status).toBe('IN_PROGRESS');
    expect(result.current.filters.priority).toBe('URGENT');
    expect(result.current.filters.search).toBe('URL搜索');
    expect(result.current.currentPage).toBe(3);
    expect(result.current.pageSize).toBe(30);
  });
});