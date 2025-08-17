import { ReactNode } from 'react'

export interface TransitionWrapperProps {
  children: ReactNode
  isVisible: boolean
  duration?: number
  className?: string
  type?: 'fade' | 'slide' | 'scale' | 'slideUp' | 'slideDown'
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export interface AnimationConfig {
  duration: number
  easing: string
  delay?: number
}

export interface InteractiveState {
  isLoading: boolean
  isHovered: boolean
  isFocused: boolean
  isPressed: boolean
  isDisabled: boolean
}