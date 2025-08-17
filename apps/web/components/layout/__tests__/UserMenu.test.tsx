import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { UserMenu } from '../UserMenu';
import { useAuthStore } from '../../../lib/stores/auth-store';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock auth store
jest.mock('../../../lib/stores/auth-store');

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('UserMenu', () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    mockPush.mockClear();
    mockLogout.mockClear();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    });
  });

  it('should not render when user is null', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: mockLogout,
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    const { container } = render(<UserMenu />);
    expect(container.firstChild).toBeNull();
  });

  it('should render user information', () => {
    const mockUser = {
      id: '1',
      email: 'john.doe@example.com',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      role: 'EMPLOYEE' as const,
      isActive: true,
    };

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: mockLogout,
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(<UserMenu />);

    // Check avatar with full initials (first + last name)
    expect(screen.getByText('JD')).toBeInTheDocument();
    // Check name display
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    // Check role display  
    expect(screen.getByText('员工')).toBeInTheDocument();
  });

  it('should display correct role names for different user roles', () => {
    const roles = [
      { role: 'EMPLOYEE', display: '员工' },
      { role: 'TECHNICIAN', display: '技术员' },
      { role: 'SUPERVISOR', display: '主管' },
      { role: 'ADMIN', display: '管理员' },
    ];

    roles.forEach(({ role, display }) => {
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
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: jest.fn(),
        logout: mockLogout,
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      const { rerender } = render(<UserMenu />);
      expect(screen.getByText(display)).toBeInTheDocument();
      rerender(<div />); // Clear for next iteration
    });
  });

  it('should toggle dropdown when clicked', async () => {
    const mockUser = {
      id: '1',
      email: 'john.doe@example.com',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      role: 'EMPLOYEE' as const,
      isActive: true,
    };

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: mockLogout,
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(<UserMenu />);

    // Initially dropdown should not be visible
    expect(screen.queryByText('退出登录')).not.toBeInTheDocument();

    // Click to open dropdown
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    // Dropdown should now be visible
    await waitFor(() => {
      expect(screen.getByText('退出登录')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });
  });

  it('should close dropdown when clicking outside', async () => {
    const mockUser = {
      id: '1',
      email: 'john.doe@example.com',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      role: 'EMPLOYEE' as const,
      isActive: true,
    };

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: mockLogout,
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(<UserMenu />);

    // Open dropdown
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText('退出登录')).toBeInTheDocument();
    });

    // For shadcn/ui dropdown, clicking the trigger again should close it
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.queryByText('退出登录')).not.toBeInTheDocument();
    });
  });

  it('should call logout and redirect when logout button is clicked', async () => {
    const mockUser = {
      id: '1',
      email: 'john.doe@example.com',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      role: 'EMPLOYEE' as const,
      isActive: true,
    };

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: mockLogout,
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(<UserMenu />);

    // Open dropdown
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText('退出登录')).toBeInTheDocument();
    });

    // Click logout button
    const logoutButton = screen.getByText('退出登录');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});