'use client';

import * as React from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { ChartWrapper } from '../data-display/charts/ChartWrapper';
import { BIZLINK_CHART_CONFIG } from '../data-display/types';
import { BarChartProps } from './types';

export function CustomBarChart({ 
  data, 
  title, 
  width = '100%', 
  height = 300,
  orientation = 'vertical',
  barColor,
  loading = false,
  error 
}: BarChartProps) {
  // Handle empty data
  if (!loading && !error && (!data || data.length === 0)) {
    return (
      <ChartWrapper title={title}>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">暂无数据</div>
        </div>
      </ChartWrapper>
    );
  }

  // Enhanced chart config with BizLink branding
  const chartConfig = {
    ...BIZLINK_CHART_CONFIG,
    value: {
      label: '数值',
      color: barColor || 'hsl(var(--chart-1))',
    },
  };

  return (
    <ChartWrapper 
      title={title}
      isLoading={loading}
      error={error}
    >
      <ChartContainer 
        config={chartConfig} 
        className="w-full"
        style={{ minHeight: `${height}px` }}
      >
        <BarChart 
          data={data}
          layout={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          {orientation === 'vertical' ? (
            <>
              {React.createElement(XAxis as any, { 
                dataKey: "name",
                tickLine: false,
                axisLine: false,
                tick: { fontSize: 12, fill: 'var(--muted-foreground)' }
              })}
              {React.createElement(YAxis as any, { 
                tickLine: false,
                axisLine: false,
                tick: { fontSize: 12, fill: 'var(--muted-foreground)' }
              })}
            </>
          ) : (
            <>
              {React.createElement(XAxis as any, { 
                type: "number",
                tickLine: false,
                axisLine: false,
                tick: { fontSize: 12, fill: 'var(--muted-foreground)' }
              })}
              {React.createElement(YAxis as any, { 
                type: "category",
                dataKey: "name",
                tickLine: false,
                axisLine: false,
                tick: { fontSize: 12, fill: 'var(--muted-foreground)' }
              })}
            </>
          )}
          <ChartTooltip 
            content={
              <ChartTooltipContent 
                hideLabel={false}
                indicator="dot"
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toLocaleString() : value,
                  name
                ]}
              />
            }
          />
          {React.createElement(Bar as any, { 
            dataKey: "value",
            fill: "var(--color-value)",
            radius: 4
          })}
        </BarChart>
      </ChartContainer>
    </ChartWrapper>
  );
}