"use client"

import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  ClipboardListIcon, 
  ClockIcon, 
  AlertTriangleIcon,
  ServerIcon
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useKPIDataStore } from '@/lib/stores/kpi-data-store'

interface KPICard {
  title: string
  value: string | number
  change?: {
    value: number
    trend: 'up' | 'down' | 'neutral'
    period: string
  }
  icon: React.ComponentType<{ className?: string }>
  description?: string
  isLoading?: boolean
}

function KPIMetricCard({ card }: { card: KPICard }) {
  const Icon = card.icon
  const isPositive = card.change?.trend === 'up'
  const isNegative = card.change?.trend === 'down'
  
  if (card.isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {card.title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{card.value}</div>
        {card.description && (
          <p className="text-xs text-muted-foreground mt-1">
            {card.description}
          </p>
        )}
        {card.change && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-2">
            {isPositive && <TrendingUpIcon className="h-3 w-3 text-green-500" />}
            {isNegative && <TrendingDownIcon className="h-3 w-3 text-red-500" />}
            <span className={cn(
              "font-medium",
              isPositive && "text-green-500",
              isNegative && "text-red-500"
            )}>
              {isPositive ? '+' : ''}{card.change.value}%
            </span>
            <span>{card.change.period}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function KPISectionCards() {
  const { 
    workOrderKPI, 
    timeKPI, 
    assetKPI, 
    workOrderLoading, 
    timeLoading, 
    assetLoading 
  } = useKPIDataStore()

  const loading = workOrderLoading || timeLoading || assetLoading

  // Helper function to format time values
  const formatTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} 分钟`;
    } else if (hours < 24) {
      return `${Math.round(hours * 10) / 10} 小时`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round((hours % 24) * 10) / 10;
      return `${days} 天 ${remainingHours} 小时`;
    }
  };

  // Calculate pending work orders from status breakdown
  const pendingWorkOrders = workOrderKPI?.statistics ? 
    (workOrderKPI.statistics.byStatus['PENDING'] || 0) + 
    (workOrderKPI.statistics.byStatus['IN_PROGRESS'] || 0) + 
    (workOrderKPI.statistics.byStatus['WAITING_PARTS'] || 0) + 
    (workOrderKPI.statistics.byStatus['WAITING_EXTERNAL'] || 0) : 0

  const kpiCards: KPICard[] = [
    {
      title: '总工单数',
      value: workOrderKPI?.statistics?.total || 0,
      icon: ClipboardListIcon,
      description: '累计工单总数',
      isLoading: workOrderLoading
    },
    {
      title: '待处理工单',
      value: pendingWorkOrders,
      icon: AlertTriangleIcon,
      description: '需要处理的工单',
      isLoading: workOrderLoading
    },
    {
      title: '平均修复时间 (MTTR)',
      value: timeKPI?.mttrData?.averageMTTR ? formatTime(timeKPI.mttrData.averageMTTR) : '计算中',
      icon: ClockIcon,
      description: '故障修复平均时间',
      isLoading: timeLoading
    },
    {
      title: '设备完好率',
      value: assetKPI?.healthOverview?.averageHealthScore ? 
        `${Math.round(assetKPI.healthOverview.averageHealthScore)}%` : '评估中',
      icon: ServerIcon,
      description: '设备健康度评分',
      isLoading: assetLoading
    }
  ]

  const loadingCards: KPICard[] = [
    { title: '', value: '', icon: ClipboardListIcon, isLoading: true },
    { title: '', value: '', icon: AlertTriangleIcon, isLoading: true },
    { title: '', value: '', icon: ClockIcon, isLoading: true },
    { title: '', value: '', icon: ServerIcon, isLoading: true }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {loading ? (
        loadingCards.map((card, index) => (
          <KPIMetricCard key={index} card={card} />
        ))
      ) : (
        kpiCards.map((card, index) => (
          <KPIMetricCard key={index} card={card} />
        ))
      )}
    </div>
  )
}