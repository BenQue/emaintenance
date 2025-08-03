'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChartProps } from './types';

export function CustomBarChart({ 
  data, 
  title, 
  width = '100%', 
  height = 300,
  orientation = 'vertical',
  barColor = '#8884d8',
  loading = false,
  error 
}: BarChartProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">错误: {error}</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">暂无数据</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
      )}
      <ResponsiveContainer width={width} height={height}>
        <BarChart 
          data={data}
          layout={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
        >
          <CartesianGrid strokeDasharray="3 3" />
          {orientation === 'vertical' ? (
            <>
              <XAxis 
                dataKey="name"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
              />
            </>
          ) : (
            <>
              <XAxis 
                type="number"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
              />
            </>
          )}
          <Tooltip />
          <Bar 
            dataKey="value" 
            fill={barColor}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}