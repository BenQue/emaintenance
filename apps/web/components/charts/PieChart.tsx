'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChartProps } from './types';

// Type assertions for Recharts v3 compatibility
const PieChartComponent = PieChart as any;
const PieComponent = Pie as any;
const CellComponent = Cell as any;
const LegendComponent = Legend as any;
const TooltipComponent = Tooltip as any;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function CustomPieChart({ 
  data, 
  title, 
  width = '100%', 
  height = 300,
  showLabel = true,
  showLegend = true,
  loading = false,
  error 
}: PieChartProps) {
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

  const renderLabel = (entry: any) => {
    if (!showLabel) return '';
    return `${entry.name}: ${entry.value}`;
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
      )}
      <ResponsiveContainer width={width} height={height}>
        <PieChartComponent>
          <PieComponent
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <CellComponent 
                key={`cell-${index}`} 
                fill={entry.color || COLORS[index % COLORS.length]} 
              />
            ))}
          </PieComponent>
          <TooltipComponent />
          {showLegend && <LegendComponent />}
        </PieChartComponent>
      </ResponsiveContainer>
    </div>
  );
}