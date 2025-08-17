"use client"

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
import { MoreHorizontalIcon, FilterIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface WorkOrderData {
  id: string
  title: string
  assignee: string
  priority: "高" | "中" | "低"
  status: "待处理" | "进行中" | "已完成" | "已取消"
  createdAt: string
  type: string
}

const tableData: WorkOrderData[] = [
  {
    id: "WO-001",
    title: "生产线A设备异常",
    assignee: "张工程师",
    priority: "高",
    status: "进行中",
    createdAt: "2024-08-15",
    type: "故障维修"
  },
  {
    id: "WO-002", 
    title: "空调系统定期保养",
    assignee: "李技师",
    priority: "中",
    status: "已完成",
    createdAt: "2024-08-14",
    type: "预防维护"
  },
  {
    id: "WO-003",
    title: "电梯安全检查",
    assignee: "王师傅",
    priority: "高",
    status: "待处理", 
    createdAt: "2024-08-13",
    type: "安全检查"
  },
  {
    id: "WO-004",
    title: "网络设备更换",
    assignee: "赵工程师",
    priority: "中",
    status: "进行中",
    createdAt: "2024-08-12",
    type: "设备更换"
  },
  {
    id: "WO-005",
    title: "消防系统测试",
    assignee: "孙技师",
    priority: "低",
    status: "已完成",
    createdAt: "2024-08-11",
    type: "系统测试"
  }
]

function getStatusBadge(status: WorkOrderData["status"]) {
  const variants = {
    "待处理": "destructive",
    "进行中": "default", 
    "已完成": "secondary",
    "已取消": "outline"
  } as const

  return (
    <Badge variant={variants[status] || "outline"}>
      {status}
    </Badge>
  )
}

function getPriorityBadge(priority: WorkOrderData["priority"]) {
  const variants = {
    "高": "destructive",
    "中": "default",
    "低": "secondary"
  } as const

  return (
    <Badge variant={variants[priority] || "outline"}>
      {priority}
    </Badge>
  )
}

export function KPIDataTable() {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>最新工单</CardTitle>
            <CardDescription>
              最近创建的工单和处理状态
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <FilterIcon className="mr-2 h-4 w-4" />
              筛选
            </Button>
            <Button size="sm">查看全部</Button>
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
              {tableData.map((workOrder) => (
                <TableRow key={workOrder.id}>
                  <TableCell className="font-medium">
                    {workOrder.id}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {workOrder.title}
                    </div>
                  </TableCell>
                  <TableCell>{workOrder.assignee}</TableCell>
                  <TableCell>
                    {getPriorityBadge(workOrder.priority)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(workOrder.status)}
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {workOrder.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {workOrder.createdAt}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>查看详情</DropdownMenuItem>
                        <DropdownMenuItem>编辑</DropdownMenuItem>
                        <DropdownMenuItem>分配</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}