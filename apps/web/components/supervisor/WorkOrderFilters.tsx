'use client';

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { WorkOrderStatus, Priority, WorkOrderStatusLabels, PriorityLabels } from '../../lib/types/work-order';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

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
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">所有状态</option>
              {Object.entries(WorkOrderStatusLabels).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">所有优先级</option>
              {Object.entries(PriorityLabels).map(([priority, label]) => (
                <option key={priority} value={priority}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="开始日期"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="结束日期"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}