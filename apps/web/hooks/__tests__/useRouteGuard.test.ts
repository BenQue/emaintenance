import { renderHook, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useRouteGuard } from '../useRouteGuard';
import { useAuth } from '../useAuth';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock useAuth hook
jest.mock('../useAuth');

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('useRouteGuard', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    });
  });

  it('should redirect to login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    renderHook(() => useRouteGuard());

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should not redirect when loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    renderHook(() => useRouteGuard());

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should not redirect when authenticated', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'EMPLOYEE' as const,
      isActive: true,
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    renderHook(() => useRouteGuard());

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should redirect EMPLOYEE to work-orders page', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'EMPLOYEE' as const,
      isActive: true,
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    const { result } = renderHook(() => useRouteGuard());

    act(() => {
      result.current.redirectBasedOnRole();
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard/work-orders');
  });

  it('should redirect TECHNICIAN to my-tasks page', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'TECHNICIAN' as const,
      isActive: true,
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    const { result } = renderHook(() => useRouteGuard());

    act(() => {
      result.current.redirectBasedOnRole();
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard/my-tasks');
  });

  it('should redirect SUPERVISOR to dashboard page', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'SUPERVISOR' as const,
      isActive: true,
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    const { result } = renderHook(() => useRouteGuard());

    act(() => {
      result.current.redirectBasedOnRole();
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('should redirect ADMIN to dashboard page', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'ADMIN' as const,
      isActive: true,
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    const { result } = renderHook(() => useRouteGuard());

    act(() => {
      result.current.redirectBasedOnRole();
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('should check if user can access route based on role', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'EMPLOYEE' as const,
      isActive: true,
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    const { result } = renderHook(() => useRouteGuard());

    // Employee should be able to access employee routes
    expect(result.current.canAccessRoute(['EMPLOYEE'])).toBe(true);
    expect(result.current.canAccessRoute(['EMPLOYEE', 'TECHNICIAN'])).toBe(true);
    
    // Employee should not be able to access supervisor routes
    expect(result.current.canAccessRoute(['SUPERVISOR'])).toBe(false);
    expect(result.current.canAccessRoute(['ADMIN'])).toBe(false);
  });

  it('should return false for canAccessRoute when no user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    const { result } = renderHook(() => useRouteGuard());

    expect(result.current.canAccessRoute(['EMPLOYEE'])).toBe(false);
  });
});