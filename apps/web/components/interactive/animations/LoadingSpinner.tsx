"use client"

import React from 'react'
import { LoadingSpinnerProps } from './types'
import { cn } from '../../../lib/utils'

export function LoadingSpinner({
  size = 'md',
  className,
  text,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  const borderClasses = {
    sm: 'border-2',
    md: 'border-2',
    lg: 'border-4',
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex items-center space-x-2">
        <div
          className={cn(
            "animate-spin rounded-full border-primary border-t-transparent",
            sizeClasses[size],
            borderClasses[size]
          )}
          role="status"
          aria-label="加载中"
        />
        {text && (
          <span className="text-sm text-muted-foreground animate-pulse">
            {text}
          </span>
        )}
      </div>
    </div>
  )
}

LoadingSpinner.displayName = "LoadingSpinner"