import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';
import { useAuthStore } from '../../../lib/stores/auth-store';

// Mock the auth store
jest.mock('../../../lib/stores/auth-store');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('LoginForm', () => {
  const mockLogin = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      error: null,
      isLoading: false,
      clearError: mockClearError,
      user: null,
      isAuthenticated: false,
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });
  });

  it('renders login form with all required fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('邮箱或用户名')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: '登录' });
    await user.click(submitButton);

    expect(screen.getByText('请输入邮箱或用户名')).toBeInTheDocument();
    expect(screen.getByText('请输入密码')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('邮箱或用户名');
    const passwordInput = screen.getByLabelText('密码');
    const submitButton = screen.getByRole('button', { name: '登录' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    expect(mockLogin).toHaveBeenCalledWith({
      emailOrUsername: 'test@example.com',
      password: 'password123',
    });
  });

  it('displays loading state during submission', () => {
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      error: null,
      isLoading: true,
      clearError: mockClearError,
      user: null,
      isAuthenticated: false,
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: '登录中...' });
    expect(submitButton).toBeDisabled();
  });

  it('displays error message when login fails', () => {
    const errorMessage = '用户名或密码错误';
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      error: errorMessage,
      isLoading: false,
      clearError: mockClearError,
      user: null,
      isAuthenticated: false,
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(<LoginForm />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('clears field errors when user starts typing', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // First trigger validation errors
    const submitButton = screen.getByRole('button', { name: '登录' });
    await user.click(submitButton);

    expect(screen.getByText('请输入邮箱或用户名')).toBeInTheDocument();

    // Then start typing in the email field
    const emailInput = screen.getByLabelText('邮箱或用户名');
    await user.type(emailInput, 'test');

    // The field error should be cleared
    expect(screen.queryByText('请输入邮箱或用户名')).not.toBeInTheDocument();
  });

  it('clears global error when user starts typing', async () => {
    const user = userEvent.setup();
    const errorMessage = '用户名或密码错误';
    
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      error: errorMessage,
      isLoading: false,
      clearError: mockClearError,
      user: null,
      isAuthenticated: false,
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(<LoginForm />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    // Start typing in email field
    const emailInput = screen.getByLabelText('邮箱或用户名');
    await user.type(emailInput, 'test');

    expect(mockClearError).toHaveBeenCalled();
  });
});