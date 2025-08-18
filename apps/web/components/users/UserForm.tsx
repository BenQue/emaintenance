'use client';

import React, { useState, useEffect } from 'react';
import { User, CreateUserInput, UpdateUserInput } from '../../lib/services/user-service';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface UserFormProps {
  user?: User;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const USER_ROLES = [
  { value: 'EMPLOYEE', label: '员工' },
  { value: 'TECHNICIAN', label: '技术员' },
  { value: 'SUPERVISOR', label: '主管' },
  { value: 'ADMIN', label: '管理员' },
] as const;

export const UserForm: React.FC<UserFormProps> = ({
  user,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    username: user?.username || '',
    password: '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    employeeId: user?.employeeId || '',
    role: user?.role || 'EMPLOYEE' as const,
    isActive: user?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const isEditMode = !!user;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = '邮箱地址不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }

    if (!formData.username.trim()) {
      newErrors.username = '用户名不能为空';
    } else if (formData.username.length < 3) {
      newErrors.username = '用户名至少需要3个字符';
    }

    if (!isEditMode && !formData.password.trim()) {
      newErrors.password = '密码不能为空';
    } else if (!isEditMode && formData.password.length < 6) {
      newErrors.password = '密码至少需要6个字符';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = '姓氏不能为空';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = '名字不能为空';
    }

    if (formData.employeeId && formData.employeeId.length < 3) {
      newErrors.employeeId = '工号至少需要3个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const submitData = { ...formData };
      
      // Remove password if empty in edit mode
      if (isEditMode && !submitData.password) {
        delete (submitData as any).password;
      }

      // Remove empty employeeId
      if (!submitData.employeeId) {
        delete (submitData as any).employeeId;
      }

      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? '编辑用户' : '创建新用户'}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {isEditMode ? '修改用户信息和权限设置' : '填写新用户的基本信息'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                姓氏 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('firstName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.firstName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请输入姓氏"
                disabled={isLoading}
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                名字 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('lastName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.lastName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请输入名字"
                disabled={isLoading}
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱地址 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="user@example.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Account Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                用户名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('username', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请输入用户名"
                disabled={isLoading}
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-500">{errors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工号 <span className="text-gray-400">(可选)</span>
              </label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('employeeId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.employeeId ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请输入工号"
                disabled={isLoading}
              />
              {errors.employeeId && (
                <p className="mt-1 text-xs text-red-500">{errors.employeeId}</p>
              )}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码 {!isEditMode && <span className="text-red-500">*</span>}
              {isEditMode && <span className="text-gray-400">(留空表示不修改)</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('password', e.target.value)}
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={isEditMode ? '留空表示不修改密码' : '请输入密码'}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? '隐藏' : '显示'}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户角色 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {USER_ROLES.map((role) => (
                <label
                  key={role.value}
                  className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${
                    formData.role === role.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={formData.role === role.value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('role', e.target.value)}
                    className="sr-only"
                    disabled={isLoading}
                  />
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-medium">{role.label}</span>
                    {formData.role === role.value && (
                      <Badge className="bg-blue-100 text-blue-800">已选择</Badge>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Status (only for edit mode) */}
          {isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                账户状态
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={() => handleInputChange('isActive', true)}
                    className="mr-2"
                    disabled={isLoading}
                  />
                  <span className="text-sm">激活</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isActive"
                    checked={!formData.isActive}
                    onChange={() => handleInputChange('isActive', false)}
                    className="mr-2"
                    disabled={isLoading}
                  />
                  <span className="text-sm">停用</span>
                </label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? '保存中...' : isEditMode ? '更新用户' : '创建用户'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};