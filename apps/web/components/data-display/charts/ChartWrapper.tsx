'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ChartWrapperProps } from '../types'

export function ChartWrapper({
  title,
  description,
  children,
  actions,
  isLoading = false,
  error = null,
  className,
}: ChartWrapperProps) {
  if (isLoading) {
    return (
      <Card className={cn('transition-all duration-200', className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              {description && <Skeleton className="h-4 w-64" />}
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-end space-x-2 h-64">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton 
                  key={i} 
                  className="w-full"
                  style={{ height: `${30 + Math.random() * 70}%` }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/50', className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-red-700 dark:text-red-300">{title}</CardTitle>
              {description && (
                <CardDescription className="text-red-600 dark:text-red-400">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 space-y-3">
            <div className="text-red-600 dark:text-red-400">图表加载失败</div>
            <p className="text-sm text-red-500 dark:text-red-400 text-center">{error}</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('transition-all duration-200 hover:shadow-md', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
          {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}