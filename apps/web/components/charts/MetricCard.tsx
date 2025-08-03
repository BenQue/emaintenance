'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { MetricCardData } from './types';

interface MetricCardProps {
  data: MetricCardData;
  loading?: boolean;
  error?: string;
}

export function MetricCard({ data, loading = false, error }: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <div className="text-red-500 text-sm">错误: {error}</div>
      </div>
    );
  }

  const getTrendIcon = () => {
    if (!data.trend) return null;
    
    switch (data.trend.direction) {
      case 'up':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    if (!data.trend) return '';
    
    switch (data.trend.direction) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">
            {data.title}
          </p>
          <div className="flex items-baseline">
            <p className="text-2xl font-bold text-gray-900">
              {data.value}
            </p>
            {data.unit && (
              <span className="ml-1 text-sm text-gray-500">
                {data.unit}
              </span>
            )}
          </div>
          {data.trend && (
            <div className={`flex items-center mt-2 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="ml-1 text-sm font-medium">
                {data.trend.percentage}%
              </span>
            </div>
          )}
          {data.description && (
            <p className="text-xs text-gray-500 mt-2">
              {data.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}