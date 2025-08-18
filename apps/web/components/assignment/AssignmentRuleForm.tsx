'use client';

import React, { useState, useEffect } from 'react';
import { useAssignmentStore } from '../../lib/stores/assignment-store';
import {
  AssignmentRule,
  CreateAssignmentRuleRequest,
  UpdateAssignmentRuleRequest,
  PRIORITY_OPTIONS,
  CATEGORY_OPTIONS
} from '../../lib/types/assignment';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface AssignmentRuleFormProps {
  rule?: AssignmentRule;
  onSubmit: (data: CreateAssignmentRuleRequest | UpdateAssignmentRuleRequest) => Promise<void>;
  onCancel: () => void;
}

export default function AssignmentRuleForm({ rule, onSubmit, onCancel }: AssignmentRuleFormProps) {
  const { technicians, loadTechnicians, techniciansLoading } = useAssignmentStore();
  
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    priority: rule?.priority || 0,
    isActive: rule?.isActive ?? true,
    assetTypes: rule?.assetTypes || [],
    categories: rule?.categories || [],
    locations: rule?.locations || [],
    priorities: rule?.priorities || [],
    assignToId: rule?.assignToId || '',
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '规则名称不能为空';
    }

    if (!formData.assignToId) {
      newErrors.assignToId = '请选择指定技术员';
    }

    // At least one condition must be specified
    const hasConditions = 
      formData.assetTypes.length > 0 ||
      formData.categories.length > 0 ||
      formData.locations.length > 0 ||
      formData.priorities.length > 0;

    if (!hasConditions) {
      newErrors.conditions = '至少需要指定一个匹配条件';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArrayFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => {
      const currentArray = prev[field] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      
      return { ...prev, [field]: newArray };
    });
  };

  const handleLocationAdd = (location: string) => {
    if (location.trim() && !formData.locations.includes(location.trim())) {
      setFormData(prev => ({
        ...prev,
        locations: [...prev.locations, location.trim()]
      }));
    }
  };

  const handleLocationRemove = (location: string) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.filter(loc => loc !== location)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rule Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          规则名称 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className={`mt-1 block w-full rounded-md border ${
            errors.name ? 'border-red-300' : 'border-gray-300'
          } px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
          placeholder="输入规则名称"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Priority */}
      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
          优先级
        </label>
        <input
          type="number"
          id="priority"
          min="0"
          max="100"
          value={formData.priority}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-sm text-gray-500">数值越大优先级越高（0-100）</p>
      </div>

      {/* Assigned Technician */}
      <div className="space-y-2">
        <Label htmlFor="assignToId">
          指定技术员 <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.assignToId}
          onValueChange={(value: string) => setFormData(prev => ({ ...prev, assignToId: value }))}
          disabled={techniciansLoading}
        >
          <SelectTrigger className={errors.assignToId ? 'border-destructive' : ''}>
            <SelectValue placeholder="选择技术员" />
          </SelectTrigger>
          <SelectContent>
            {technicians.map((tech) => (
              <SelectItem key={tech.id} value={tech.id}>
                {tech.firstName} {tech.lastName} ({tech.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.assignToId && <p className="mt-1 text-sm text-destructive">{errors.assignToId}</p>}
      </div>

      {/* Matching Conditions */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">匹配条件</h3>
        {errors.conditions && (
          <p className="mb-4 text-sm text-red-600">{errors.conditions}</p>
        )}

        {/* Categories */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            工单类别
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((category) => (
              <label key={category.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.categories.includes(category.value)}
                  onChange={() => handleArrayFieldChange('categories', category.value)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{category.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Priorities */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            工单优先级
          </label>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map((priority) => (
              <label key={priority.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.priorities.includes(priority.value)}
                  onChange={() => handleArrayFieldChange('priorities', priority.value)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{priority.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Locations */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            设备位置
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="输入位置并按回车添加"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleLocationAdd(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.locations.map((location) => (
              <span
                key={location}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {location}
                <button
                  type="button"
                  onClick={() => handleLocationRemove(location)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Active Status */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">启用此规则</span>
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? '保存中...' : rule ? '更新规则' : '创建规则'}
        </button>
      </div>
    </form>
  );
}