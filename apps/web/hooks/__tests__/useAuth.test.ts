import { renderHook } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { useAuthStore } from '../../lib/stores/auth-store';

// Mock auth store
jest.mock('../../lib/stores/auth-store');

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('useAuth', () => {
  it('should return auth store values and methods', () => {
    const mockStoreReturn = {
      user: {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'EMPLOYEE' as const,
        isActive: true,
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    };

    mockUseAuthStore.mockReturnValue(mockStoreReturn);

    const { result } = renderHook(() => useAuth());

    expect(result.current).toEqual(mockStoreReturn);
  });

  it('should return null user when not authenticated', () => {
    const mockStoreReturn = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    };

    mockUseAuthStore.mockReturnValue(mockStoreReturn);

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should return loading state', () => {
    const mockStoreReturn = {
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    };

    mockUseAuthStore.mockReturnValue(mockStoreReturn);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
  });

  it('should return error state', () => {
    const mockStoreReturn = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: '登录失败',
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    };

    mockUseAuthStore.mockReturnValue(mockStoreReturn);

    const { result } = renderHook(() => useAuth());

    expect(result.current.error).toBe('登录失败');
  });
});