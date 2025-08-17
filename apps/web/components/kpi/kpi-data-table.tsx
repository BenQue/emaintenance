"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontalIcon, FilterIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, EditIcon, UserIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { workOrderService } from "@/lib/services/work-order-service"
import { WorkOrder, WorkOrderStatus, Priority } from "@/lib/types/work-order"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"

// Priority order for sorting (highest to lowest)
const PRIORITY_ORDER = {
  [Priority.URGENT]: 4,
  [Priority.HIGH]: 3,
  [Priority.MEDIUM]: 2,
  [Priority.LOW]: 1,
}

// Incomplete statuses
const INCOMPLETE_STATUSES = [
  WorkOrderStatus.PENDING,
  WorkOrderStatus.IN_PROGRESS,
  WorkOrderStatus.WAITING_PARTS,
  WorkOrderStatus.WAITING_EXTERNAL,
]

function getStatusBadge(status: WorkOrderStatus) {
  const variants = {
    [WorkOrderStatus.PENDING]: "destructive",
    [WorkOrderStatus.IN_PROGRESS]: "default", 
    [WorkOrderStatus.WAITING_PARTS]: "secondary",
    [WorkOrderStatus.WAITING_EXTERNAL]: "secondary",
    [WorkOrderStatus.COMPLETED]: "secondary",
    [WorkOrderStatus.CANCELLED]: "outline"
  } as const

  const labels = {
    [WorkOrderStatus.PENDING]: "待处理",
    [WorkOrderStatus.IN_PROGRESS]: "进行中",
    [WorkOrderStatus.WAITING_PARTS]: "等待配件",
    [WorkOrderStatus.WAITING_EXTERNAL]: "等待外协",
    [WorkOrderStatus.COMPLETED]: "已完成",
    [WorkOrderStatus.CANCELLED]: "已取消"
  }

  return (
    <Badge variant={variants[status] || "outline"}>
      {labels[status] || status}
    </Badge>
  )
}

function getPriorityBadge(priority: Priority) {
  const variants = {
    [Priority.URGENT]: "destructive",
    [Priority.HIGH]: "destructive", 
    [Priority.MEDIUM]: "default",
    [Priority.LOW]: "secondary"
  } as const

  const labels = {
    [Priority.URGENT]: "紧急",
    [Priority.HIGH]: "高",
    [Priority.MEDIUM]: "中",
    [Priority.LOW]: "低"
  }

  return (
    <Badge variant={variants[priority] || "outline"}>
      {labels[priority] || priority}
    </Badge>
  )
}

export function KPIDataTable() {
  const router = useRouter()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  
  const pageSize = 5

  const loadWorkOrders = async (page: number = 1) => {
    setLoading(true)
    setError(null)
    try {
      // Fetch all work orders first, then filter on client side
      const response = await workOrderService.getAllWorkOrders(
        {},
        1,
        50 // Fetch more records to ensure we have enough incomplete ones
      )
      
      // Filter for incomplete work orders only
      const incompleteWorkOrders = response.workOrders.filter(wo => 
        INCOMPLETE_STATUSES.includes(wo.status)
      )
      
      // Sort by priority (high to low) then by creation date (newest first)
      const sortedWorkOrders = incompleteWorkOrders.sort((a, b) => {
        const priorityA = PRIORITY_ORDER[a.priority] || 0
        const priorityB = PRIORITY_ORDER[b.priority] || 0
        
        if (priorityA !== priorityB) {
          return priorityB - priorityA // Higher priority first
        }
        
        // If priorities are equal, sort by creation date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      
      // Implement client-side pagination
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedWorkOrders = sortedWorkOrders.slice(startIndex, endIndex)
      
      setWorkOrders(paginatedWorkOrders)
      setTotalRecords(incompleteWorkOrders.length)
      setTotalPages(Math.ceil(incompleteWorkOrders.length / pageSize))
    } catch (err) {
      console.error('工单加载失败:', err)
      setError(err instanceof Error ? err.message : '加载工单失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkOrders(currentPage)
  }, [currentPage])

  const handleViewDetails = (workOrderId: string) => {
    router.push(`/dashboard/work-orders/${workOrderId}`)
  }

  const handleEdit = (workOrderId: string) => {
    router.push(`/dashboard/work-orders/${workOrderId}/edit`)
  }

  const handleAssign = (workOrderId: string) => {
    router.push(`/dashboard/work-orders/${workOrderId}/assign`)
  }

  const handleViewAll = () => {
    router.push('/dashboard/work-orders')
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MM-dd HH:mm', { locale: zhCN })
    } catch {
      return dateString
    }
  }

  const renderTableContent = () => {
    if (loading) {
      return Array.from({ length: pageSize }).map((_, index) => (
        <TableRow key={`skeleton-${index}`}>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
        </TableRow>
      ))
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="text-center py-8 text-red-600">
            {error}
          </TableCell>
        </TableRow>
      )
    }

    if (workOrders.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
            暂无未完成的工单
          </TableCell>
        </TableRow>
      )
    }

    return workOrders.map((workOrder) => (
      <TableRow key={workOrder.id}>
        <TableCell className="font-medium">
          {workOrder.id}
        </TableCell>
        <TableCell>
          <div className="font-medium">
            {workOrder.title}
          </div>
        </TableCell>
        <TableCell>
          {workOrder.assignedTo ? 
            `${workOrder.assignedTo.firstName} ${workOrder.assignedTo.lastName}` : 
            <span className="text-muted-foreground">未分配</span>
          }
        </TableCell>
        <TableCell>
          {getPriorityBadge(workOrder.priority)}
        </TableCell>
        <TableCell>
          {getStatusBadge(workOrder.status)}
        </TableCell>
        <TableCell>
          <span className="text-muted-foreground">
            {workOrder.category}
          </span>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatDate(workOrder.createdAt)}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewDetails(workOrder.id)}>
                <EyeIcon className="mr-2 h-4 w-4" />
                查看详情
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(workOrder.id)}>
                <EditIcon className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAssign(workOrder.id)}>
                <UserIcon className="mr-2 h-4 w-4" />
                分配
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>未完成工单</CardTitle>
          <CardDescription>
            按优先级排序的未完成工单列表 ({totalRecords} 条)
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadWorkOrders(currentPage)}>
            <FilterIcon className="mr-2 h-4 w-4" />
            刷新
          </Button>
          <Button size="sm" onClick={handleViewAll}>查看全部</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>工单号</TableHead>
              <TableHead>标题</TableHead>
              <TableHead>负责人</TableHead>
              <TableHead>优先级</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderTableContent()}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        {totalPages > 1 && !loading && !error && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              显示 {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalRecords)} 条，
              共 {totalRecords} 条记录
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeftIcon className="h-4 w-4" />
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                下一页
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}