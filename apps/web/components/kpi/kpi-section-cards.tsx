"use client"

import { useState, useEffect } from 'react'
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
import { workOrderService } from '@/lib/services/work-order-service'
import { assetService } from '@/lib/services/asset-service'

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
  const [kpiData, setKpiData] = useState<KPICard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchKPIData = async () => {
      try {
        setLoading(true)
        setError(null)

        const filters = { timeRange: 'month' as const }
        
        // Fetch data from services
        const [
          workOrderStats,
          mttrData,
          assetHealthOverview
        ] = await Promise.all([
          workOrderService.getStatistics(filters),
          workOrderService.getMTTRStatistics({ ...filters, granularity: 'week' as const }),
          assetService.getHealthOverview(filters),
        ])

        const kpiCards: KPICard[] = [
          {
            title: '总工单数',
            value: workOrderStats?.total || 0,
            change: workOrderStats?.previousTotal ? {
              value: Math.round(((workOrderStats.total - workOrderStats.previousTotal) / workOrderStats.previousTotal) * 100),
              trend: (workOrderStats.total >= workOrderStats.previousTotal) ? 'up' : 'down',
              period: '较上月'
            } : undefined,
            icon: ClipboardListIcon,
            description: '本月累计工单'
          },
          {
            title: '待处理工单',
            value: workOrderStats?.pending || 0,
            change: workOrderStats?.previousPending ? {
              value: Math.round(((workOrderStats.pending - workOrderStats.previousPending) / workOrderStats.previousPending) * 100),
              trend: (workOrderStats.pending <= workOrderStats.previousPending) ? 'up' : 'down', // Lower pending is better
              period: '较上月'
            } : undefined,
            icon: AlertTriangleIcon,
            description: '需要处理的工单'
          },
          {
            title: '平均响应时间',
            value: mttrData?.average ? `${mttrData.average}小时` : '计算中',
            change: mttrData?.previousAverage ? {
              value: Math.round(((mttrData.average - mttrData.previousAverage) / mttrData.previousAverage) * 100),
              trend: (mttrData.average <= mttrData.previousAverage) ? 'up' : 'down', // Lower response time is better
              period: '较上月'
            } : undefined,
            icon: ClockIcon,
            description: '工单平均响应时间'
          },
          {
            title: '设备完好率',
            value: assetHealthOverview?.healthScore ? `${assetHealthOverview.healthScore}%` : '评估中',
            change: assetHealthOverview?.previousHealthScore ? {
              value: Math.round(assetHealthOverview.healthScore - assetHealthOverview.previousHealthScore),
              trend: (assetHealthOverview.healthScore >= assetHealthOverview.previousHealthScore) ? 'up' : 'down',
              period: '较上月'
            } : undefined,
            icon: ServerIcon,
            description: '设备正常运行比率'
          }
        ]

        setKpiData(kpiCards)
      } catch (err) {
        console.error('Error fetching KPI data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        
        // Set default data on error
        const defaultCards: KPICard[] = [
          {
            title: '总工单数',
            value: '加载失败',
            icon: ClipboardListIcon,
            description: '本月累计工单'
          },
          {
            title: '待处理工单',
            value: '加载失败',
            icon: AlertTriangleIcon,
            description: '需要处理的工单'
          },
          {
            title: '平均响应时间',
            value: '加载失败',
            icon: ClockIcon,
            description: '工单平均响应时间'
          },
          {
            title: '设备完好率',
            value: '加载失败',
            icon: ServerIcon,
            description: '设备正常运行比率'
          }
        ]
        setKpiData(defaultCards)
      } finally {
        setLoading(false)
      }
    }

    fetchKPIData()
  }, [])

  const loadingCards: KPICard[] = [
    { title: '', value: '', icon: ClipboardListIcon, isLoading: true },
    { title: '', value: '', icon: AlertTriangleIcon, isLoading: true },
    { title: '', value: '', icon: ClockIcon, isLoading: true },
    { title: '', value: '', icon: ServerIcon, isLoading: true }
  ]

  return (
    <div className="px-4 lg:px-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          loadingCards.map((card, index) => (
            <KPIMetricCard key={index} card={card} />
          ))
        ) : (
          kpiData.map((card, index) => (
            <KPIMetricCard key={index} card={card} />
          ))
        )}
      </div>
    </div>
  )
}