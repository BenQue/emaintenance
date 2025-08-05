import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { AuthenticatedLayout } from '../AuthenticatedLayout';
import { useAuthStore } from '../../../lib/stores/auth-store';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock auth store
jest.mock('../../../lib/stores/auth-store');

// Mock Navigation component
jest.mock('../Navigation', () => ({
  Navigation: () => <div data-testid="navigation">Navigation Component</div>,
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('AuthenticatedLayout', () => {
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

  it('should show loading state when authentication is being checked', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      checkAuth: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      error: null,
    });

    render(
      <AuthenticatedLayout>
        <div>Test Content</div>
      </AuthenticatedLayout>
    );

    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', async () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      checkAuth: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      error: null,
    });

    render(
      <AuthenticatedLayout>
        <div>Test Content</div>
      </AuthenticatedLayout>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should render children when user is authenticated', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'EMPLOYEE' as const,
      isActive: true,
    };

    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: mockUser,
      checkAuth: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      error: null,
    });

    render(
      <AuthenticatedLayout>
        <div>Test Content</div>
      </AuthenticatedLayout>
    );

    expect(screen.getByTestId('navigation')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should call checkAuth on mount', () => {
    const mockCheckAuth = jest.fn();
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'EMPLOYEE',
        isActive: true,
      },
      checkAuth: mockCheckAuth,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      error: null,
    });

    render(
      <AuthenticatedLayout>
        <div>Test Content</div>
      </AuthenticatedLayout>
    );

    expect(mockCheckAuth).toHaveBeenCalledTimes(1);
  });

  it('should not render anything when not authenticated and not loading', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      checkAuth: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      error: null,
    });

    const { container } = render(
      <AuthenticatedLayout>
        <div>Test Content</div>
      </AuthenticatedLayout>
    );

    expect(container.firstChild).toBeNull();
  });
});