export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

export interface ChartProps {
  data: ChartData[] | TrendData[];
  title?: string;
  width?: number | string;
  height?: number;
  loading?: boolean;
  error?: string;
}

export interface PieChartProps extends ChartProps {
  data: ChartData[];
  showLabel?: boolean;
  showLegend?: boolean;
}

export interface TrendChartProps extends ChartProps {
  data: TrendData[];
  xAxisKey?: string;
  yAxisKey?: string;
  lineColor?: string;
}

export interface BarChartProps extends ChartProps {
  data: ChartData[];
  orientation?: 'horizontal' | 'vertical';
  barColor?: string;
}

export interface MetricCardData {
  title: string;
  value: string | number;
  unit?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  description?: string;
}