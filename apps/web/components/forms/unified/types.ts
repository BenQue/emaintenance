import { FieldValues, UseFormReturn } from "react-hook-form"

export interface BaseFormProps<T extends FieldValues = FieldValues> {
  form: UseFormReturn<T>
  onSubmit: (data: T) => void | Promise<void>
  loading?: boolean
  disabled?: boolean
  className?: string
}

export interface FormFieldConfig {
  name: string
  label: string
  description?: string
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'date' | 'file'
  placeholder?: string
  required?: boolean
  options?: Array<{ label: string; value: string }>
  validation?: object
}

export interface UnifiedFormProps<T extends FieldValues = FieldValues> extends BaseFormProps<T> {
  fields: FormFieldConfig[]
  title?: string
  submitButtonText?: string
}