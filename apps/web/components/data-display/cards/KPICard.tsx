'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KPICardProps } from '../types'

export function KPICard({
  title,
  value,
  previousValue,
  unit = '',
  trend,
  trendValue,
  description,
  isLoading = false,
  error = null,
  className,
}: KPICardProps) {
  if (isLoading) {
    return (
      <Card className={cn('transition-all duration-200', className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-24" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/50', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600 dark:text-red-400">加载失败</div>
          <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString()
    }
    return val
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />
      case 'down':
        return <TrendingDown className="h-4 w-4" />
      case 'stable':
        return <Minus className="h-4 w-4" />
      default:
        return null
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600 dark:text-green-400'
      case 'down':
        return 'text-red-600 dark:text-red-400'
      case 'stable':
        return 'text-gray-600 dark:text-gray-400'
      default:
        return 'text-muted-foreground'
    }
  }

  const getTrendBadgeVariant = () => {
    switch (trend) {
      case 'up':
        return 'default' as const
      case 'down':
        return 'destructive' as const
      case 'stable':
        return 'secondary' as const
      default:
        return 'secondary' as const
    }
  }

  const calculateChange = () => {
    if (previousValue && typeof value === 'number' && typeof previousValue === 'number') {
      const change = ((value - previousValue) / previousValue) * 100
      return change
    }
    return null
  }

  const change = calculateChange()

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md hover:scale-[1.02]',
      className
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="text-3xl font-bold">
            {formatValue(value)}
            {unit && <span className="text-lg text-muted-foreground ml-1">{unit}</span>}
          </div>
        </div>

        {(trend || trendValue !== undefined || change) && (
          <div className="flex items-center space-x-2">
            {trend && (
              <div className={cn('flex items-center', getTrendColor())}>
                {getTrendIcon()}
              </div>
            )}
            {(trendValue !== undefined || change) && (
              <Badge variant={getTrendBadgeVariant()} className="text-xs">
                {trendValue !== undefined ? `${trendValue > 0 ? '+' : ''}${trendValue}%` : 
                 change ? `${change > 0 ? '+' : ''}${change.toFixed(1)}%` : ''}
              </Badge>
            )}
            {previousValue && (
              <span className="text-xs text-muted-foreground">
                vs {formatValue(previousValue)}{unit}
              </span>
            )}
          </div>
        )}

        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}