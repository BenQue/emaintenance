import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { AuthenticatedLayout } from '../AuthenticatedLayout';
import { useAuthStore } from '../../../lib/stores/auth-store';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock auth store - we'll control this in tests
jest.mock('../../../lib/stores/auth-store');

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock Navigation and UserMenu components for integration testing
jest.mock('../Navigation', () => ({
  Navigation: ({ children }: { children?: React.ReactNode }) => (
    <nav data-testid="navigation">
      <div>Navigation Component</div>
      {children}
    </nav>
  ),
}));

describe('Authentication Integration Tests', () => {
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

  it('should complete full authentication flow', async () => {
    const mockCheckAuth = jest.fn();
    let authState = {
      isAuthenticated: false,
      isLoading: true,
      user: null,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: mockCheckAuth,
    };

    // Initially loading
    mockUseAuthStore.mockReturnValue(authState);

    const { rerender } = render(
      <AuthenticatedLayout>
        <div data-testid="protected-content">Protected Content</div>
      </AuthenticatedLayout>
    );

    // Should show loading state
    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(mockCheckAuth).toHaveBeenCalledTimes(1);

    // Simulate authentication check complete but not authenticated
    authState = {
      ...authState,
      isLoading: false,
      isAuthenticated: false,
    };
    mockUseAuthStore.mockReturnValue(authState);
    rerender(
      <AuthenticatedLayout>
        <div data-testid="protected-content">Protected Content</div>
      </AuthenticatedLayout>
    );

    // Should redirect to login
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    // Simulate successful authentication
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'EMPLOYEE' as const,
      isActive: true,
    };

    authState = {
      ...authState,
      isAuthenticated: true,
      user: mockUser,
    };
    mockUseAuthStore.mockReturnValue(authState);
    rerender(
      <AuthenticatedLayout>
        <div data-testid="protected-content">Protected Content</div>
      </AuthenticatedLayout>
    );

    // Should render protected content
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  it('should handle authentication state persistence on page refresh', async () => {
    const mockCheckAuth = jest.fn();
    
    // Simulate page refresh - initial loading state
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: mockCheckAuth,
    });

    const { rerender } = render(
      <AuthenticatedLayout>
        <div data-testid="protected-content">Protected Content</div>
      </AuthenticatedLayout>
    );

    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(mockCheckAuth).toHaveBeenCalledTimes(1);

    // Simulate successful authentication restore from token
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'SUPERVISOR' as const,
      isActive: true,
    };

    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: mockUser,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: mockCheckAuth,
    });

    rerender(
      <AuthenticatedLayout>
        <div data-testid="protected-content">Protected Content</div>
      </AuthenticatedLayout>
    );

    // Should render protected content without redirect
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalledWith('/login');
  });

  it('should handle role-based access to different dashboard sections', async () => {
    const roles = [
      { role: 'EMPLOYEE', expectedPath: '/dashboard/work-orders' },
      { role: 'TECHNICIAN', expectedPath: '/dashboard/my-tasks' },
      { role: 'SUPERVISOR', expectedPath: '/dashboard' },
      { role: 'ADMIN', expectedPath: '/dashboard' },
    ];

    for (const { role, expectedPath } of roles) {
      mockPush.mockClear();
      
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: role as any,
        isActive: true,
      };

      mockUseAuthStore.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: mockUser,
        error: null,
        login: jest.fn(),
        logout: jest.fn(),
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(
        <AuthenticatedLayout>
          <div data-testid="dashboard-content">Dashboard for {role}</div>
        </AuthenticatedLayout>
      );

      // Verify the component renders without redirecting
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalledWith('/login');
    }
  });

  it('should handle authentication errors gracefully', async () => {
    const mockCheckAuth = jest.fn();
    
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: 'Token expired',
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: mockCheckAuth,
    });

    render(
      <AuthenticatedLayout>
        <div data-testid="protected-content">Protected Content</div>
      </AuthenticatedLayout>
    );

    // Should redirect to login even with error
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    // Should not render protected content
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should prevent multiple simultaneous authentication checks', () => {
    const mockCheckAuth = jest.fn();
    
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: mockCheckAuth,
    });

    const { rerender } = render(
      <AuthenticatedLayout>
        <div data-testid="protected-content">Protected Content</div>
      </AuthenticatedLayout>
    );

    // Re-render should not trigger another checkAuth call
    rerender(
      <AuthenticatedLayout>
        <div data-testid="protected-content">Protected Content</div>
      </AuthenticatedLayout>
    );

    expect(mockCheckAuth).toHaveBeenCalledTimes(1);
  });
});