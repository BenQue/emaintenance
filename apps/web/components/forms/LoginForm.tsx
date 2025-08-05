'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuthStore } from '../../lib/stores/auth-store';

interface LoginFormData {
  emailOrUsername: string;
  password: string;
}

export function LoginForm() {
  const router = useRouter();
  const { login, error, isLoading, clearError, user, checkAuth } = useAuthStore();
  
  const [formData, setFormData] = useState<LoginFormData>({
    emailOrUsername: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<LoginFormData>>({});

  // Check for existing authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
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
    }
  }, [user, router]);

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.emailOrUsername.trim()) {
      newErrors.emailOrUsername = '请输入邮箱或用户名';
    } else if (formData.emailOrUsername.includes('@')) {
      // Basic email validation if user entered an email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.emailOrUsername)) {
        newErrors.emailOrUsername = '请输入有效的邮箱地址';
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
      await login({
        emailOrUsername: formData.emailOrUsername,
        password: formData.password,
      });
      // Navigation will be handled by the useEffect above
    } catch (err) {
      // Error is handled by the store
    }
  };

  const handleInputChange = (field: keyof LoginFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: undefined
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
        <Label htmlFor="emailOrUsername">
          邮箱或用户名
        </Label>
        <div className="mt-1">
          <Input
            id="emailOrUsername"
            name="emailOrUsername"
            type="text"
            autoComplete="username"
            value={formData.emailOrUsername}
            onChange={handleInputChange('emailOrUsername')}
            error={!!fieldErrors.emailOrUsername}
            placeholder="请输入邮箱或用户名"
            aria-describedby={fieldErrors.emailOrUsername ? 'emailOrUsername-error' : undefined}
            aria-invalid={!!fieldErrors.emailOrUsername}
          />
          {fieldErrors.emailOrUsername && (
            <p id="emailOrUsername-error" className="mt-1 text-sm text-red-600" role="alert">
              {fieldErrors.emailOrUsername}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="password">
          密码
        </Label>
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
          <div className="text-sm text-red-800">
            {error}
          </div>
        </div>
      )}

      <div>
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? '登录中...' : '登录'}
        </Button>
      </div>
    </form>
  );
}