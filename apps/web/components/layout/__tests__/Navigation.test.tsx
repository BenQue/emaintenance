import { render, screen } from '@testing-library/react';
import { Navigation } from '../Navigation';
import { useAuthStore } from '../../../lib/stores/auth-store';

// Mock auth store
jest.mock('../../../lib/stores/auth-store');

// Mock UserMenu component
jest.mock('../UserMenu', () => ({
  UserMenu: () => <div data-testid="user-menu">User Menu</div>,
}));

// Mock BizLinkLogo component
jest.mock('../../ui/BizLinkLogo', () => ({
  NavigationLogo: () => <div data-testid="navigation-logo">BizLink Logo</div>,
}));

// Mock usePathname hook
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock useIsMobile hook
jest.mock('../../../hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('Navigation', () => {
  it('should not render when user is null', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    const { container } = render(<Navigation />);
    expect(container.firstChild).toBeNull();
  });

  it('should render navigation for EMPLOYEE role', () => {
    const mockUser = {
      id: '1',
      email: 'employee@example.com',
      username: 'employee',
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
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(<Navigation />);

    expect(screen.getByText('E-Maintenance')).toBeInTheDocument();
    expect(screen.getByText('设备维护管理')).toBeInTheDocument();
    expect(screen.getByText('工单管理')).toBeInTheDocument();
    expect(screen.getByText('通知中心')).toBeInTheDocument();
    expect(screen.queryByText('仪表板')).not.toBeInTheDocument();
    expect(screen.queryByText('我的任务')).not.toBeInTheDocument();
    expect(screen.queryByText('设备管理')).not.toBeInTheDocument();
    expect(screen.queryByText('用户管理')).not.toBeInTheDocument();
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    expect(screen.getByTestId('navigation-logo')).toBeInTheDocument();
  });

  it('should render navigation for TECHNICIAN role', () => {
    const mockUser = {
      id: '2',
      email: 'tech@example.com',
      username: 'technician',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'TECHNICIAN' as const,
      isActive: true,
    };

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(<Navigation />);

    expect(screen.getByText('工单管理')).toBeInTheDocument();
    expect(screen.getByText('我的任务')).toBeInTheDocument();
    expect(screen.getByText('通知中心')).toBeInTheDocument();
    expect(screen.queryByText('仪表板')).not.toBeInTheDocument();
    expect(screen.queryByText('设备管理')).not.toBeInTheDocument();
    expect(screen.queryByText('用户管理')).not.toBeInTheDocument();
  });

  it('should render full navigation for SUPERVISOR role', () => {
    const mockUser = {
      id: '3',
      email: 'supervisor@example.com',
      username: 'supervisor',
      firstName: 'Bob',
      lastName: 'Johnson',
      role: 'SUPERVISOR' as const,
      isActive: true,
    };

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(<Navigation />);

    expect(screen.getByText('仪表板')).toBeInTheDocument();
    expect(screen.getByText('工单管理')).toBeInTheDocument();
    expect(screen.getByText('设备管理')).toBeInTheDocument();
    expect(screen.getByText('分配规则')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('通知中心')).toBeInTheDocument();
    expect(screen.queryByText('我的任务')).not.toBeInTheDocument();
  });

  it('should render full navigation for ADMIN role', () => {
    const mockUser = {
      id: '4',
      email: 'admin@example.com',
      username: 'admin',
      firstName: 'Alice',
      lastName: 'Wilson',
      role: 'ADMIN' as const,
      isActive: true,
    };

    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(<Navigation />);

    expect(screen.getByText('仪表板')).toBeInTheDocument();
    expect(screen.getByText('工单管理')).toBeInTheDocument();
    expect(screen.getByText('设备管理')).toBeInTheDocument();
    expect(screen.getByText('分配规则')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('通知中心')).toBeInTheDocument();
    expect(screen.queryByText('我的任务')).not.toBeInTheDocument();
  });
});