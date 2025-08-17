"use client"

import { useState, useEffect } from 'react'
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  ClipboardListIcon, 
  ClockIcon, 
  ToolIcon, 
  AlertTriangleIcon,
  RefreshCwIcon,
  CalendarIcon,
  ChevronRightIcon,
  ServerIcon,
  UsersIcon
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { workOrderService } from '@/lib/services/work-order-service'
import { assetService } from '@/lib/services/asset-service'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer 
} from 'recharts'

interface KPIMetric {
  label: string
  value: string | number
  change?: {
    value: number
    trend: 'up' | 'down' | 'neutral'
    period: string
  }
  icon: React.ComponentType<{ className?: string }>
  color: string
}

interface ChartData {
  name: string
  value: number
  trend?: number
  [key: string]: any
}

interface ModernKPIDashboardProps {
  className?: string
}

// Mock data - 在实际项目中这些数据会从API获取
const mockKPIMetrics: KPIMetric[] = [
  {
    label: '总工单数',
    value: 1247,
    change: {
      value: 12.5,
      trend: 'up',
      period: '较上月'
    },
    icon: ClipboardListIcon,
    color: 'hsl(var(--chart-1))'
  },
  {
    label: '待处理工单',
    value: 23,
    change: {
      value: -8.2,
      trend: 'down',
      period: '较上周'
    },
    icon: AlertTriangleIcon,
    color: 'hsl(var(--chart-2))'
  },
  {
    label: '平均响应时间',
    value: '2.4小时',
    change: {
      value: -15.3,
      trend: 'down',
      period: '较上月'
    },
    icon: ClockIcon,
    color: 'hsl(var(--chart-3))'
  },
  {
    label: '设备完好率',
    value: '94.8%',
    change: {
      value: 2.1,
      trend: 'up',
      period: '较上月'
    },
    icon: ServerIcon,
    color: 'hsl(var(--chart-4))'
  }
]

const mockWorkOrderTrends: ChartData[] = [
  { name: '1月', 创建: 120, 完成: 115, 进行中: 25 },
  { name: '2月', 创建: 135, 完成: 128, 进行中: 32 },
  { name: '3月', 创建: 148, 完成: 142, 进行中: 28 },
  { name: '4月', 创建: 162, 完成: 155, 进行中: 35 },
  { name: '5月', 创建: 178, 完成: 170, 进行中: 43 },
  { name: '6月', 创建: 185, 完成: 178, 进行中: 50 }
]

const mockAssetStatus: ChartData[] = [
  { name: '正常运行', value: 156, color: '#10B981' },
  { name: '维护中', value: 23, color: '#F59E0B' },
  { name: '故障', value: 8, color: '#EF4444' },
  { name: '停用', value: 12, color: '#6B7280' }
]

const mockTopIssues = [
  { name: '电机故障', count: 45, trend: 'up' },
  { name: '传感器异常', count: 32, trend: 'down' },
  { name: '系统错误', count: 28, trend: 'up' },
  { name: '网络连接', count: 15, trend: 'neutral' }
]

// Chart configuration
const chartConfig = {
  创建: {
    label: '创建工单',
    color: 'hsl(var(--chart-1))',
  },
  完成: {
    label: '完成工单', 
    color: 'hsl(var(--chart-2))',
  },
  进行中: {
    label: '进行中',
    color: 'hsl(var(--chart-3))',
  },
}

function KPIMetricCard({ metric }: { metric: KPIMetric }) {
  const Icon = metric.icon
  const isPositive = metric.change?.trend === 'up'
  const isNegative = metric.change?.trend === 'down'
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {metric.label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{metric.value}</div>
        {metric.change && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            {isPositive && <TrendingUpIcon className="h-3 w-3 text-green-500" />}
            {isNegative && <TrendingDownIcon className="h-3 w-3 text-red-500" />}
            <span className={cn(
              "font-medium",
              isPositive && "text-green-500",
              isNegative && "text-red-500"
            )}>
              {isPositive ? '+' : ''}{metric.change.value}%
            </span>
            <span>{metric.change.period}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function WorkOrderTrendChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>工单趋势</CardTitle>
        <CardDescription>近6个月工单创建和完成情况</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart data={mockWorkOrderTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area 
              type="monotone" 
              dataKey="创建" 
              stackId="1"
              stroke="var(--color-创建)" 
              fill="var(--color-创建)"
              fillOpacity={0.6}
            />
            <Area 
              type="monotone" 
              dataKey="完成" 
              stackId="2"
              stroke="var(--color-完成)" 
              fill="var(--color-完成)"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function AssetStatusChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>设备状态分布</CardTitle>
        <CardDescription>当前设备运行状态概览</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockAssetStatus.map((status, index) => (
            <div key={status.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: status.color }}
                />
                <span className="text-sm font-medium">{status.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">{status.value}台</span>
                <Progress 
                  value={(status.value / 199) * 100} 
                  className="w-16 h-2"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TopIssuesCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>热门问题</CardTitle>
            <CardDescription>本月最常见的故障类型</CardDescription>
          </div>
          <CardAction>
            <Button variant="ghost" size="sm">
              查看全部
              <ChevronRightIcon className="ml-1 h-3 w-3" />
            </Button>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockTopIssues.map((issue, index) => (
            <div key={issue.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {index + 1}
                </div>
                <span className="font-medium">{issue.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{issue.count}</Badge>
                {issue.trend === 'up' && <TrendingUpIcon className="h-3 w-3 text-red-500" />}
                {issue.trend === 'down' && <TrendingDownIcon className="h-3 w-3 text-green-500" />}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ModernKPIDashboard({ className }: ModernKPIDashboardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const handleRefresh = () => {
    setIsLoading(true)
    // 模拟API调用
    setTimeout(() => {
      setIsLoading(false)
      setLastRefresh(new Date())
    }, 1000)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">运维概览</h2>
          <p className="text-muted-foreground">
            实时监控系统运行状态和关键指标
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-muted-foreground">
            最后更新: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button onClick={handleRefresh} disabled={isLoading} size="sm">
            <RefreshCwIcon className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            刷新
          </Button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mockKPIMetrics.map((metric, index) => (
          <KPIMetricCard key={index} metric={metric} />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <WorkOrderTrendChart />
        <AssetStatusChart />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <TopIssuesCard />
        
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>常用功能快捷入口</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <ClipboardListIcon className="mr-2 h-4 w-4" />
              创建工单
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <ToolIcon className="mr-2 h-4 w-4" />
              预防性维护
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <ServerIcon className="mr-2 h-4 w-4" />
              设备巡检
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>最新动态</CardTitle>
            <CardDescription>系统最近的重要活动</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-3 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <p className="font-medium">设备A101维护完成</p>
                <p className="text-muted-foreground">2分钟前</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 text-sm">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <p className="font-medium">新工单已分配</p>
                <p className="text-muted-foreground">15分钟前</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <p className="font-medium">预警：传感器B203</p>
                <p className="text-muted-foreground">1小时前</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}