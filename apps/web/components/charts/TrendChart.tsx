'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendChartProps } from './types';

// Type assertions for Recharts v3 compatibility
const LineChartComponent = LineChart as any;
const LineComponent = Line as any;
const XAxisComponent = XAxis as any;
const YAxisComponent = YAxis as any;
const CartesianGridComponent = CartesianGrid as any;
const TooltipComponent = Tooltip as any;

export function TrendChart({ 
  data, 
  title, 
  width = '100%', 
  height = 300,
  xAxisKey = 'date',
  yAxisKey = 'value',
  lineColor = '#8884d8',
  loading = false,
  error 
}: TrendChartProps) {
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
        <LineChartComponent data={data}>
          <CartesianGridComponent strokeDasharray="3 3" />
          <XAxisComponent 
            dataKey={xAxisKey}
            tick={{ fontSize: 12 }}
          />
          <YAxisComponent 
            tick={{ fontSize: 12 }}
          />
          <TooltipComponent />
          <LineComponent 
            type="monotone" 
            dataKey={yAxisKey} 
            stroke={lineColor} 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChartComponent>
      </ResponsiveContainer>
    </div>
  );
}