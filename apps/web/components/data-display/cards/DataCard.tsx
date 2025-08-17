'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { DataCardProps } from '../types'

const variantStyles = {
  default: 'border-border',
  success: 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50',
  warning: 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/50',
  error: 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/50',
  info: 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50',
}

const variantBadgeStyles = {
  default: 'secondary',
  success: 'success',
  warning: 'warning', 
  error: 'destructive',
  info: 'secondary',
} as const

export function DataCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  showProgress = false,
  progressValue = 0,
  isLoading = false,
  error = null,
  className,
}: DataCardProps) {
  if (isLoading) {
    return (
      <Card className={cn('transition-all duration-200 hover:shadow-md', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-5 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-32" />
          {showProgress && <Skeleton className="h-2 w-full mt-3" />}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/50', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
            {title}
          </CardTitle>
          {Icon && <Icon className="h-4 w-4 text-red-500" />}
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600 dark:text-red-400">加载失败</div>
          <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md hover:scale-[1.02]',
      variantStyles[variant],
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className={cn(
            'h-4 w-4',
            variant === 'success' ? 'text-green-600' :
            variant === 'warning' ? 'text-orange-600' :
            variant === 'error' ? 'text-red-600' :
            variant === 'info' ? 'text-blue-600' :
            'text-muted-foreground'
          )} />
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {variant !== 'default' && (
            <Badge 
              variant={variantBadgeStyles[variant]}
              className="text-xs"
            >
              {variant}
            </Badge>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
        {showProgress && (
          <div className="mt-3">
            <Progress value={progressValue} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {progressValue}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}