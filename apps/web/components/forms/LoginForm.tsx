'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuthStore } from '../../lib/stores/auth-store';

interface LoginFormData {
  identifier: string;
  password: string;
}

export function LoginForm() {
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  const [formData, setFormData] = useState<LoginFormData>({
    identifier: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<LoginFormData>>({});

  // Always call the auth store hook (required by React hooks rules)
  const { login, error, isLoading, clearError, user, checkAuth, isAuthenticated } = useAuthStore();

  // Triple-check that we're on the login page
  const isDefinitelyOnLoginPage = useMemo(() => {
    const pathCheck = pathname === '/login';
    const windowCheck =
      typeof window !== 'undefined' ? window.location.pathname === '/login' : true;
    return pathCheck && windowCheck;
  }, [pathname]);

  // Only check auth if we're definitely on the login page
  useEffect(() => {
    if (!isDefinitelyOnLoginPage || hasRedirected.current) return;

    checkAuth();
  }, [checkAuth, isDefinitelyOnLoginPage]);

  // Redirect logic - only runs if definitely on login page and authenticated
  useEffect(() => {
    if (!isDefinitelyOnLoginPage || !user || !isAuthenticated || hasRedirected.current) return;

    hasRedirected.current = true;
    console.log('User found and authenticated, redirecting...', user);

    // Role-based redirect
    switch (user.role) {
      case 'EMPLOYEE':
        router.push('/dashboard/work-orders');
        break;
      case 'TECHNICIAN':
        router.push('/dashboard/my-tasks');
        break;
      case 'SUPERVISOR':
      case 'ADMIN':
        router.push('/dashboard');
        break;
      default:
        router.push('/dashboard');
    }
  }, [user, isAuthenticated, router, isDefinitelyOnLoginPage]);

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.identifier.trim()) {
      newErrors.identifier = '请输入邮箱或用户名';
    } else if (formData.identifier.includes('@')) {
      // Basic email validation if user entered an email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.identifier)) {
        newErrors.identifier = '请输入有效的邮箱地址';
      }
    }

    if (!formData.password.trim()) {
      newErrors.password = '请输入密码';
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少需要6个字符';
    }

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    clearError();

    try {
      console.log('Attempting login...');
      // Reset redirect flag to allow post-login redirect
      hasRedirected.current = false;

      await login({
        identifier: formData.identifier,
        password: formData.password,
      });
      console.log('Login successful, waiting for navigation...');
      // 立即根据当前登录用户角色导航，避免依赖异步状态触发导致的竞态
      const state = (useAuthStore as any).getState?.() || {};
      const loggedInUser = state.user || user;
      if (loggedInUser) {
        hasRedirected.current = true;
        switch (loggedInUser.role) {
          case 'EMPLOYEE':
            router.replace('/dashboard/work-orders');
            break;
          case 'TECHNICIAN':
            router.replace('/dashboard/my-tasks');
            break;
          case 'SUPERVISOR':
          case 'ADMIN':
          default:
            router.replace('/dashboard');
        }
      }
    } catch (err) {
      console.log('Login failed:', err);
      // Error is handled by the store
    }
  };

  const handleInputChange =
    (field: keyof LoginFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));

      // Clear field error when user starts typing
      if (fieldErrors[field]) {
        setFieldErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }

      // Clear global error when user starts typing
      if (error) {
        clearError();
      }
    };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" role="form" aria-label="用户登录表单">
      <div>
        <Label htmlFor="identifier">邮箱或用户名</Label>
        <div className="mt-1">
          <Input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            value={formData.identifier}
            onChange={handleInputChange('identifier')}
            error={!!fieldErrors.identifier}
            placeholder="请输入邮箱或用户名"
            aria-describedby={fieldErrors.identifier ? 'identifier-error' : undefined}
            aria-invalid={!!fieldErrors.identifier}
          />
          {fieldErrors.identifier && (
            <p id="identifier-error" className="mt-1 text-sm text-red-600" role="alert">
              {fieldErrors.identifier}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="password">密码</Label>
        <div className="mt-1">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleInputChange('password')}
            error={!!fieldErrors.password}
            placeholder="请输入密码"
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            aria-invalid={!!fieldErrors.password}
          />
          {fieldErrors.password && (
            <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
              {fieldErrors.password}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4" role="alert" aria-live="assertive">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      <div>
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? '登录中...' : '登录'}
        </Button>
      </div>
    </form>
  );
}
