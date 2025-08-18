'use client';

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { WorkOrderStatus, Priority, WorkOrderStatusLabels, PriorityLabels } from '../../lib/types/work-order';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePicker } from '../ui/date-picker';

interface WorkOrderFiltersProps {
  onFilterChange: (filters: {
    status?: string;
    priority?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
  onClearFilters: () => void;
}

export function WorkOrderFilters({ onFilterChange, onClearFilters }: WorkOrderFiltersProps) {
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    startDate: '',
    endDate: '',
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Convert empty strings to undefined for API call
    const apiFilters = Object.fromEntries(
      Object.entries(newFilters).map(([k, v]) => [k, v || undefined])
    );
    
    onFilterChange(apiFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      status: '',
      priority: '',
      search: '',
      startDate: '',
      endDate: '',
    };
    setFilters(emptyFilters);
    onClearFilters();
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            筛选条件
          </CardTitle>
          {hasActiveFilters && (
            <Button 
              onClick={handleClearFilters}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              清除筛选
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索工单标题或描述..."
              value={filters.search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('search', e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>状态</Label>
            <Select
              value={filters.status || 'ALL'}
              onValueChange={(value: string) => handleFilterChange('status', value === 'ALL' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="所有状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">所有状态</SelectItem>
                {Object.entries(WorkOrderStatusLabels).map(([status, label]) => (
                  <SelectItem key={status} value={status}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <Label>优先级</Label>
            <Select
              value={filters.priority || 'ALL'}
              onValueChange={(value: string) => handleFilterChange('priority', value === 'ALL' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="所有优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">所有优先级</SelectItem>
                {Object.entries(PriorityLabels).map(([priority, label]) => (
                  <SelectItem key={priority} value={priority}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>开始日期</Label>
            <DatePicker
              value={filters.startDate ? new Date(filters.startDate) : undefined}
              onChange={(date) => handleFilterChange('startDate', date ? date.toISOString().split('T')[0] : '')}
              placeholder="选择开始日期"
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label>结束日期</Label>
            <DatePicker
              value={filters.endDate ? new Date(filters.endDate) : undefined}
              onChange={(date) => handleFilterChange('endDate', date ? date.toISOString().split('T')[0] : '')}
              placeholder="选择结束日期"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}