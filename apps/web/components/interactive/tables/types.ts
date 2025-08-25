import { ReactNode } from 'react'

export interface ColumnDef<T> {
  id: string
  header: string | ReactNode
  accessorKey?: keyof T
  cell: (row: T) => ReactNode
  sortable?: boolean
  filterable?: boolean
  width?: string
  // Senior Developer Addition: Enhanced type safety and accessibility
  ariaLabel?: string
  sortType?: 'text' | 'number' | 'date' | 'boolean'
  align?: 'left' | 'center' | 'right'
}

export interface TableAction<T> {
  label: string
  icon?: ReactNode
  onClick: (row: T) => void
  variant?: 'default' | 'destructive'
  disabled?: (row: T) => boolean
}

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  actions?: TableAction<T>[]
  pagination?: boolean
  selection?: boolean
  onSelectionChange?: (selectedRows: T[]) => void
  onRowClick?: (row: T) => void
  loading?: boolean
  pageSize?: number
  searchable?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
}

export interface TablePaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  className?: string
}

export interface TableFiltersProps<T> {
  columns: ColumnDef<T>[]
  onFiltersChange: (filters: Record<string, any>) => void
  filters: Record<string, any>
  className?: string
}

export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export interface TableState<T> {
  data: T[]
  filteredData: T[]
  selectedRows: T[]
  currentPage: number
  pageSize: number
  sortConfig: SortConfig | null
  filters: Record<string, any>
  searchQuery: string
}