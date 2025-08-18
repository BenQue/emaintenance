import { ReactNode } from 'react'

export interface DialogWrapperProps {
  trigger: ReactNode
  title: string
  children: ReactNode
  onOpenChange?: (open: boolean) => void
  className?: string
  open?: boolean
}

export interface ConfirmDialogProps {
  trigger?: ReactNode
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  variant?: 'default' | 'destructive'
  open?: boolean
  onOpenChange?: (open: boolean) => void
  loading?: boolean
}

export interface FormDialogProps {
  trigger: ReactNode
  title: string
  children: ReactNode
  onSubmit: () => void
  submitText?: string
  cancelText?: string
  isLoading?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}