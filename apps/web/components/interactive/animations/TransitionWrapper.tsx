"use client"

import React from 'react'
import { TransitionWrapperProps } from './types'
import { cn } from '../../../lib/utils'

export function TransitionWrapper({
  children,
  isVisible,
  duration = 200,
  className,
  type = 'fade',
}: TransitionWrapperProps) {
  // Map duration to Tailwind classes - critical fix for performance
  const getDurationClass = (duration: number): string => {
    const durationMap: Record<number, string> = {
      75: 'duration-75',
      100: 'duration-100',
      150: 'duration-150',
      200: 'duration-200',
      300: 'duration-300',
      500: 'duration-500',
      700: 'duration-700',
      1000: 'duration-1000',
    }
    return durationMap[duration] || 'duration-200'
  }

  const getTransitionClasses = () => {
    const baseClasses = `transition-all ${getDurationClass(duration)} ease-in-out`
    
    switch (type) {
      case 'fade':
        return cn(
          baseClasses,
          isVisible 
            ? 'opacity-100' 
            : 'opacity-0 pointer-events-none'
        )
      case 'slide':
        return cn(
          baseClasses,
          'transform',
          isVisible 
            ? 'translate-x-0 opacity-100' 
            : '-translate-x-full opacity-0 pointer-events-none'
        )
      case 'scale':
        return cn(
          baseClasses,
          'transform origin-center',
          isVisible 
            ? 'scale-100 opacity-100' 
            : 'scale-95 opacity-0 pointer-events-none'
        )
      case 'slideUp':
        return cn(
          baseClasses,
          'transform',
          isVisible 
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-2 opacity-0 pointer-events-none'
        )
      case 'slideDown':
        return cn(
          baseClasses,
          'transform',
          isVisible 
            ? 'translate-y-0 opacity-100' 
            : '-translate-y-2 opacity-0 pointer-events-none'
        )
      default:
        return baseClasses
    }
  }

  return (
    <div 
      className={cn(getTransitionClasses(), className)}
      aria-hidden={!isVisible}
      role="presentation"
    >
      {children}
    </div>
  )
}

TransitionWrapper.displayName = "TransitionWrapper"