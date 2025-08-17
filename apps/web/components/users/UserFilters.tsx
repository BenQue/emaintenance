'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

interface UserFiltersProps {
  onFilterChange: (filters: UserFilterValues) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export interface UserFilterValues {
  search?: string;
  role?: 'EMPLOYEE' | 'TECHNICIAN' | 'SUPERVISOR' | 'ADMIN' | '';
  isActive?: boolean | '';
}

const USER_ROLES = [
  { value: '', label: '全部角色' },
  { value: 'EMPLOYEE', label: '员工' },
  { value: 'TECHNICIAN', label: '技术员' },
  { value: 'SUPERVISOR', label: '主管' },
  { value: 'ADMIN', label: '管理员' },
];

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: true, label: '已激活' },
  { value: false, label: '已停用' },
];

export const UserFilters: React.FC<UserFiltersProps> = ({
  onFilterChange,
  onReset,
  isLoading = false,
}) => {
  const [filters, setFilters] = useState<UserFilterValues>({
    search: '',
    role: '',
    isActive: '',
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Debounced search - Using useCallback to prevent unnecessary re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange(filters);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters]); // Remove onFilterChange from dependencies to prevent infinite loops

  const handleFilterChange = (key: keyof UserFilterValues, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({
      search: '',
      role: '',
      isActive: '',
    });
    onReset();
  };

  const hasActiveFilters = filters.search || filters.role || filters.isActive !== '';

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">搜索和筛选</h3>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
              className="text-gray-600 hover:text-gray-700"
            >
              重置
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={isLoading}
          >
            {isExpanded ? '收起' : '展开'}筛选
          </Button>
        </div>
      </div>
      {/* Search Input - Always Visible */}
      <div className="space-y-2">
        <Label>搜索用户</Label>
        <div className="relative">
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="输入姓名、邮箱或用户ID搜索..."
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
      </div>

      {/* Advanced Filters - Collapsible */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Role Filter */}
          <div className="space-y-2">
            <Label>角色筛选</Label>
            <Select
              value={filters.role || 'ALL'}
              onValueChange={(value: string) => handleFilterChange('role', value === 'ALL' ? '' : value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部角色</SelectItem>
                <SelectItem value="EMPLOYEE">员工</SelectItem>
                <SelectItem value="TECHNICIAN">技术员</SelectItem>
                <SelectItem value="SUPERVISOR">主管</SelectItem>
                <SelectItem value="ADMIN">管理员</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>状态筛选</Label>
            <Select
              value={filters.isActive?.toString() || 'ALL'}
              onValueChange={(value: string) => {
                if (value === 'ALL') {
                  handleFilterChange('isActive', '');
                } else {
                  handleFilterChange('isActive', value === 'true');
                }
              }}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="true">已激活</SelectItem>
                <SelectItem value="false">已停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500">当前筛选:</span>
            
            {filters.search && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                搜索: "{filters.search}"
                <button
                  onClick={() => handleFilterChange('search', '')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                  disabled={isLoading}
                >
                  ×
                </button>
              </span>
            )}

            {filters.role && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                角色: {USER_ROLES.find(r => r.value === filters.role)?.label}
                <button
                  onClick={() => handleFilterChange('role', '')}
                  className="ml-1 text-green-600 hover:text-green-800"
                  disabled={isLoading}
                >
                  ×
                </button>
              </span>
            )}

            {filters.isActive !== '' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                状态: {STATUS_OPTIONS.find(s => s.value === filters.isActive)?.label}
                <button
                  onClick={() => handleFilterChange('isActive', '')}
                  className="ml-1 text-purple-600 hover:text-purple-800"
                  disabled={isLoading}
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};