"use client"

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table'
import { Checkbox } from '../../ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Badge } from '../../ui/badge'
import { MoreHorizontalIcon, ChevronUpIcon, ChevronDownIcon } from 'lucide-react'
import { DataTableProps, ColumnDef, SortConfig } from './types'
import { cn } from '../../../lib/utils'

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  pagination = true,
  selection = false,
  onSelectionChange,
  onRowClick,
  loading = false,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = "搜索...",
  emptyMessage = "暂无数据",
  className,
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<T[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery) return data

    return data.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
  }, [data, searchQuery])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [filteredData, sortConfig])

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData

    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize, pagination])

  const totalPages = Math.ceil(filteredData.length / pageSize)

  const handleSort = (columnId: string) => {
    const column = columns.find(col => col.id === columnId)
    if (!column?.sortable) return

    setSortConfig(prev => ({
      key: columnId,
      direction: prev?.key === columnId && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedRows(paginatedData)
      onSelectionChange?.(paginatedData)
    } else {
      setSelectedRows([])
      onSelectionChange?.([])
    }
  }, [paginatedData, onSelectionChange])

  const handleSelectRow = useCallback((row: T, checked: boolean) => {
    let newSelection: T[]
    if (checked) {
      newSelection = [...selectedRows, row]
    } else {
      newSelection = selectedRows.filter(selected => selected !== row)
    }
    setSelectedRows(newSelection)
    onSelectionChange?.(newSelection)
  }, [selectedRows, onSelectionChange])

  // Performance optimization: debounced search
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  const debouncedSearch = useCallback((value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value)
      setCurrentPage(1) // Reset to first page on search
    }, 300)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const isRowSelected = (row: T) => selectedRows.includes(row)
  const isAllSelected = paginatedData.length > 0 && paginatedData.every(row => isRowSelected(row))
  const isIndeterminate = selectedRows.length > 0 && !isAllSelected

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Search Bar */}
      {searchable && (
        <div className="flex items-center space-x-2">
          <Input
            ref={searchInputRef}
            placeholder={searchPlaceholder}
            defaultValue={searchQuery}
            onChange={(e) => debouncedSearch(e.target.value)}
            className="max-w-sm"
            aria-label="搜索表格数据"
          />
          {selectedRows.length > 0 && (
            <Badge variant="secondary">
              已选择 {selectedRows.length} 项
            </Badge>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    {...(isIndeterminate && { indeterminate: true })}
                    onCheckedChange={handleSelectAll}
                    aria-label="选择全部"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    "text-primary font-medium",
                    column.sortable && "cursor-pointer hover:bg-muted/50",
                    column.width && `w-${column.width}`
                  )}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {column.sortable && sortConfig?.key === column.id && (
                      sortConfig.direction === 'asc' ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-20">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selection ? 1 : 0) + 1} 
                  className="h-24 text-center"
                >
                  加载中...
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selection ? 1 : 0) + 1} 
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => (
                <TableRow
                  key={row.id || `row-${index}`}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    isRowSelected(row) && "bg-muted"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selection && (
                    <TableCell key={`${row.id || index}-selection`}>
                      <Checkbox
                        checked={isRowSelected(row)}
                        onCheckedChange={(checked: boolean) => handleSelectRow(row, checked)}
                        aria-label={`选择行 ${index + 1}`}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={`${row.id || index}-${column.id}`}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                  <TableCell key={`${row.id || index}-actions`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontalIcon className="h-4 w-4" />
                          <span className="sr-only">打开菜单</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>查看详情</DropdownMenuItem>
                        <DropdownMenuItem>编辑</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">删除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            共 {filteredData.length} 条记录，第 {currentPage} 页，共 {totalPages} 页
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

DataTable.displayName = "DataTable"