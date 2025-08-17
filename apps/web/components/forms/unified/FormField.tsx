"use client"

import { Control, FieldPath, FieldValues, RegisterOptions } from "react-hook-form"
import {
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "../../ui/form"
import { Input } from "../../ui/input"
import { Textarea } from "../../ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { Calendar } from "../../ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover"
import { Button } from "../../ui/button"
import { CalendarIcon, CheckCircle, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { cn } from "../../../lib/utils"
import { validationStyles } from "./FormValidation"

interface UnifiedFormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>
  name: TName
  label: string
  description?: string
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'date' | 'file'
  placeholder?: string
  options?: Array<{ label: string; value: string }>
  disabled?: boolean
  className?: string
  rules?: RegisterOptions<TFieldValues, TName>
  showValidationIcon?: boolean
  maxLength?: number
  accept?: string // for file input
}

export function UnifiedFormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  description,
  type,
  placeholder,
  options = [],
  disabled = false,
  className,
  rules,
  showValidationIcon = true,
  maxLength,
  accept,
}: UnifiedFormFieldProps<TFieldValues, TName>) {
  const renderField = (field: any, fieldState: any) => {
    const hasError = fieldState.error
    const isValid = !hasError && field.value && field.value !== ''
    
    const getInputClassName = (baseClassName: string = '') => {
      return cn(
        baseClassName,
        hasError && validationStyles.errorBorder,
        isValid && showValidationIcon && validationStyles.successBorder,
        className
      )
    }

    switch (type) {
      case 'select':
        return (
          <div className="relative">
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={disabled}
            >
              <SelectTrigger className={getInputClassName("w-full")}>
                <SelectValue placeholder={placeholder || `选择${label}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showValidationIcon && (
              <div className="absolute right-10 top-1/2 transform -translate-y-1/2" aria-hidden="true">
                {hasError && (
                  <AlertCircle className={cn("h-4 w-4", validationStyles.errorIcon)} />
                )}
                {isValid && (
                  <CheckCircle className={cn("h-4 w-4", validationStyles.successIcon)} />
                )}
              </div>
            )}
          </div>
        )

      case 'textarea':
        return (
          <div className="relative">
            <Textarea
              {...field}
              placeholder={placeholder}
              disabled={disabled}
              maxLength={maxLength}
              className={getInputClassName("min-h-[100px]")}
            />
            {maxLength && (
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                {field.value?.length || 0}/{maxLength}
              </div>
            )}
            {showValidationIcon && (
              <div className="absolute right-3 top-3" aria-hidden="true">
                {hasError && (
                  <AlertCircle className={cn("h-4 w-4", validationStyles.errorIcon)} />
                )}
                {isValid && (
                  <CheckCircle className={cn("h-4 w-4", validationStyles.successIcon)} />
                )}
              </div>
            )}
          </div>
        )

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !field.value && "text-muted-foreground",
                  className
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {field.value ? (
                  format(field.value, "PPP", { locale: zhCN })
                ) : (
                  <span>{placeholder || `选择${label}`}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                disabled={disabled}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )

      case 'file':
        return (
          <div className="relative">
            <Input
              type="file"
              accept={accept}
              onChange={(e) => field.onChange(e.target.files)}
              disabled={disabled}
              className={getInputClassName()}
            />
            {showValidationIcon && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2" aria-hidden="true">
                {hasError && (
                  <AlertCircle className={cn("h-4 w-4", validationStyles.errorIcon)} />
                )}
                {isValid && (
                  <CheckCircle className={cn("h-4 w-4", validationStyles.successIcon)} />
                )}
              </div>
            )}
          </div>
        )

      case 'password':
        return (
          <div className="relative">
            <Input
              {...field}
              type="password"
              placeholder={placeholder}
              disabled={disabled}
              maxLength={maxLength}
              className={getInputClassName()}
            />
            {showValidationIcon && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2" aria-hidden="true">
                {hasError && (
                  <AlertCircle className={cn("h-4 w-4", validationStyles.errorIcon)} />
                )}
                {isValid && (
                  <CheckCircle className={cn("h-4 w-4", validationStyles.successIcon)} />
                )}
              </div>
            )}
          </div>
        )

      case 'email':
        return (
          <div className="relative">
            <Input
              {...field}
              type="email"
              placeholder={placeholder}
              disabled={disabled}
              maxLength={maxLength}
              className={getInputClassName()}
            />
            {showValidationIcon && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2" aria-hidden="true">
                {hasError && (
                  <AlertCircle className={cn("h-4 w-4", validationStyles.errorIcon)} />
                )}
                {isValid && (
                  <CheckCircle className={cn("h-4 w-4", validationStyles.successIcon)} />
                )}
              </div>
            )}
          </div>
        )

      default: // 'text'
        return (
          <div className="relative">
            <Input
              {...field}
              type="text"
              placeholder={placeholder}
              disabled={disabled}
              maxLength={maxLength}
              className={getInputClassName()}
            />
            {showValidationIcon && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2" aria-hidden="true">
                {hasError && (
                  <AlertCircle className={cn("h-4 w-4", validationStyles.errorIcon)} />
                )}
                {isValid && (
                  <CheckCircle className={cn("h-4 w-4", validationStyles.successIcon)} />
                )}
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <ShadcnFormField
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel className="text-bizlink-700 font-medium">
            {label}
            {rules?.required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </FormLabel>
          <FormControl>
            {renderField(field, fieldState)}
          </FormControl>
          {description && (
            <FormDescription className="text-sm text-muted-foreground">
              {description}
            </FormDescription>
          )}
          <FormMessage className={cn(
            "text-sm",
            fieldState.error ? validationStyles.errorText : "text-muted-foreground"
          )} />
        </FormItem>
      )}
    />
  )
}

UnifiedFormField.displayName = "UnifiedFormField"