import { ChartConfig } from "@/components/ui/chart"

// Base data display component props
export interface BaseDataDisplayProps {
  isLoading?: boolean
  error?: string | null
  className?: string
}

// Chart data types
export interface ChartDataPoint {
  [key: string]: string | number
}

export interface ChartProps extends BaseDataDisplayProps {
  data: ChartDataPoint[]
  config: ChartConfig
  height?: number
  showTooltip?: boolean
  showLegend?: boolean
}

// Card component types
export interface DataCardProps extends BaseDataDisplayProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  showProgress?: boolean
  progressValue?: number
}

export interface KPICardProps extends BaseDataDisplayProps {
  title: string
  value: string | number
  previousValue?: string | number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: number
  description?: string
}

export interface StatCardProps extends BaseDataDisplayProps {
  label: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period: string
  }
  format?: 'number' | 'percentage' | 'currency'
}

// Progress indicator types
export interface ProgressIndicatorProps extends BaseDataDisplayProps {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error'
}

// Status badge types
export interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Loading states types
export interface LoadingStatesProps {
  type: 'card' | 'chart' | 'table' | 'list'
  count?: number
  className?: string
}

// Chart wrapper types
export interface ChartWrapperProps extends BaseDataDisplayProps {
  title?: string
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
}

// Data table types (for future Story 6.5)
export interface DataTableColumn<T = any> {
  key: keyof T
  label: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: T) => React.ReactNode
}

export interface DataTableProps<T = any> extends BaseDataDisplayProps {
  data: T[]
  columns: DataTableColumn<T>[]
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
  sorting?: {
    key: keyof T
    direction: 'asc' | 'desc'
    onSort: (key: keyof T, direction: 'asc' | 'desc') => void
  }
  filtering?: {
    filters: Record<string, any>
    onFilter: (filters: Record<string, any>) => void
  }
}

// BizLink brand chart configuration
export const BIZLINK_CHART_CONFIG: ChartConfig = {
  primary: {
    label: '主要数据',
    color: 'hsl(var(--chart-1))',
  },
  secondary: {
    label: '次要数据', 
    color: 'hsl(var(--chart-2))',
  },
  tertiary: {
    label: '第三数据',
    color: 'hsl(var(--chart-3))',
  },
  success: {
    label: '成功',
    color: 'hsl(var(--chart-4))',
  },
  warning: {
    label: '警告',
    color: 'hsl(var(--chart-5))',
  },
  info: {
    label: '信息',
    color: 'hsl(var(--chart-6))',
  },
}

// Status variant mapping
export const STATUS_VARIANTS = {
  PENDING: 'warning' as const,
  IN_PROGRESS: 'info' as const,
  COMPLETED: 'success' as const,
  CANCELLED: 'error' as const,
  DRAFT: 'secondary' as const,
} as const

// Data formatting utilities types
export interface FormatOptions {
  type: 'number' | 'percentage' | 'currency' | 'date' | 'time'
  precision?: number
  locale?: string
  currency?: string
}

export type DataFormatter = (value: any, options?: FormatOptions) => string