"use client"

import { cn } from "../../../lib/utils"
import { Form } from "../../ui/form"
import { Button } from "../../ui/button"
import { Progress } from "../../ui/progress"
import { BaseFormProps } from "./types"
import { FieldValues } from "react-hook-form"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { useEffect, useState } from "react"

interface FormWrapperProps<T extends FieldValues = FieldValues> extends BaseFormProps<T> {
  children: React.ReactNode
  title?: string
  submitButtonText?: string
  submitProgress?: number
  showProgress?: boolean
  successMessage?: string
  errorMessage?: string
  autoSave?: boolean
  autoSaveDelay?: number
  onCancel?: () => void
  cancelButtonText?: string
}

export function FormWrapper<T extends FieldValues = FieldValues>({
  form,
  onSubmit,
  children,
  title,
  submitButtonText = "提交",
  loading = false,
  disabled = false,
  submitProgress,
  showProgress = false,
  successMessage,
  errorMessage,
  autoSave = false,
  autoSaveDelay = 2000,
  onCancel,
  cancelButtonText = "取消",
  className,
}: FormWrapperProps<T>) {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Auto-save functionality with debouncing
  useEffect(() => {
    if (!autoSave) return

    let timeoutId: NodeJS.Timeout

    const subscription = form.watch((value, { name, type }) => {
      if (type === 'change' && name) {
        setAutoSaveStatus('saving')
        
        // Clear previous timeout to debounce saves
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        
        timeoutId = setTimeout(() => {
          // Here you would implement actual auto-save logic
          // For now, we just simulate successful save
          setAutoSaveStatus('saved')
          setTimeout(() => setAutoSaveStatus('idle'), 2000)
        }, autoSaveDelay)
      }
    })

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      subscription.unsubscribe()
    }
  }, [form, autoSave, autoSaveDelay])

  // Handle submit status changes
  useEffect(() => {
    if (submitStatus !== 'idle') {
      const timer = setTimeout(() => setSubmitStatus('idle'), 3000)
      return () => clearTimeout(timer)
    }
  }, [submitStatus])

  const handleSubmit = async (data: T) => {
    try {
      setSubmitStatus('idle')
      await onSubmit(data)
      setSubmitStatus('success')
    } catch (error) {
      setSubmitStatus('error')
      throw error
    }
  }
  return (
    <div className={cn("space-y-6", className)}>
      {title && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-bizlink-700">
              {title}
            </h2>
            
            {/* Auto-save status indicator */}
            {autoSave && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {autoSaveStatus === 'saving' && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>保存中...</span>
                  </>
                )}
                {autoSaveStatus === 'saved' && (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">已自动保存</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          {showProgress && submitProgress !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>提交进度</span>
                <span>{Math.round(submitProgress)}%</span>
              </div>
              <Progress value={submitProgress} className="h-2" />
            </div>
          )}

          {/* Submit status indicators */}
          {submitStatus === 'success' && successMessage && (
            <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 p-2 rounded-md">
              <CheckCircle className="h-4 w-4" />
              <span>{successMessage}</span>
            </div>
          )}
          
          {submitStatus === 'error' && errorMessage && (
            <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {children}
          
          {submitButtonText && (
            <div className="flex justify-between items-center pt-4">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                >
                  {cancelButtonText}
                </Button>
              )}
              <div className={cn("flex space-x-2", !onCancel && "ml-auto")}>
                <Button
                  type="submit"
                  disabled={loading || disabled}
                  className={cn(
                    "bg-bizlink-500 hover:bg-bizlink-600 text-white transition-all duration-200",
                    submitStatus === 'success' && "bg-green-600 hover:bg-green-700",
                    submitStatus === 'error' && "bg-red-600 hover:bg-red-700"
                  )}
                >
                  {loading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {!loading && submitStatus === 'success' && (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  {!loading && submitStatus === 'error' && (
                    <AlertCircle className="mr-2 h-4 w-4" />
                  )}
                  {submitButtonText}
                </Button>
              </div>
            </div>
          )}
        </form>
      </Form>
    </div>
  )
}

FormWrapper.displayName = "FormWrapper"