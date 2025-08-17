/**
 * TypeScript type definitions for shadcn/ui components
 * E-Maintenance System - BizLink Integration
 */

import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import * as LabelPrimitive from "@radix-ui/react-label"
import * as SelectPrimitive from "@radix-ui/react-select"
import { buttonVariants } from "./button"
import { badgeVariants } from "./badge"

// =============================================================================
// Button Types
// =============================================================================

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

// =============================================================================
// Card Types  
// =============================================================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardTitleProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardActionProps extends React.HTMLAttributes<HTMLDivElement> {}

// =============================================================================
// Input Types
// =============================================================================

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean // Backward compatibility
}

// =============================================================================
// Label Types
// =============================================================================

export interface LabelProps
  extends React.ComponentProps<typeof LabelPrimitive.Root> {}

// =============================================================================
// Badge Types
// =============================================================================

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

// =============================================================================
// Dialog Types
// =============================================================================

export interface DialogProps
  extends React.ComponentProps<typeof DialogPrimitive.Root> {}

export interface DialogTriggerProps
  extends React.ComponentProps<typeof DialogPrimitive.Trigger> {}

export interface DialogContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content> {
  showCloseButton?: boolean
}

export interface DialogHeaderProps extends React.ComponentProps<"div"> {}

export interface DialogFooterProps extends React.ComponentProps<"div"> {}

export interface DialogTitleProps
  extends React.ComponentProps<typeof DialogPrimitive.Title> {}

export interface DialogDescriptionProps
  extends React.ComponentProps<typeof DialogPrimitive.Description> {}

// =============================================================================
// Form Types
// =============================================================================

export interface FormItemProps extends React.ComponentProps<"div"> {}

export interface FormLabelProps
  extends React.ComponentProps<typeof LabelPrimitive.Root> {}

export interface FormControlProps extends React.ComponentProps<"div"> {}

export interface FormDescriptionProps extends React.ComponentProps<"p"> {}

export interface FormMessageProps extends React.ComponentProps<"p"> {}

// =============================================================================
// Table Types
// =============================================================================

export interface TableProps extends React.ComponentProps<"table"> {}

export interface TableHeaderProps extends React.ComponentProps<"thead"> {}

export interface TableBodyProps extends React.ComponentProps<"tbody"> {}

export interface TableFooterProps extends React.ComponentProps<"tfoot"> {}

export interface TableRowProps extends React.ComponentProps<"tr"> {}

export interface TableHeadProps extends React.ComponentProps<"th"> {}

export interface TableCellProps extends React.ComponentProps<"td"> {}

export interface TableCaptionProps extends React.ComponentProps<"caption"> {}

// =============================================================================
// Alert Types
// =============================================================================

export interface AlertProps extends React.ComponentProps<"div"> {
  variant?: "default" | "destructive"
}

export interface AlertTitleProps extends React.ComponentProps<"div"> {}

export interface AlertDescriptionProps extends React.ComponentProps<"div"> {}

// =============================================================================
// Select Types
// =============================================================================

export interface SelectProps
  extends React.ComponentProps<typeof SelectPrimitive.Root> {}

export interface SelectGroupProps
  extends React.ComponentProps<typeof SelectPrimitive.Group> {}

export interface SelectValueProps
  extends React.ComponentProps<typeof SelectPrimitive.Value> {}

export interface SelectTriggerProps
  extends React.ComponentProps<typeof SelectPrimitive.Trigger> {
  size?: "sm" | "default"
}

export interface SelectContentProps
  extends React.ComponentProps<typeof SelectPrimitive.Content> {}

export interface SelectLabelProps
  extends React.ComponentProps<typeof SelectPrimitive.Label> {}

export interface SelectItemProps
  extends React.ComponentProps<typeof SelectPrimitive.Item> {}

export interface SelectSeparatorProps
  extends React.ComponentProps<typeof SelectPrimitive.Separator> {}

// =============================================================================
// Brand Color Types
// =============================================================================

export type BizLinkColorVariant = 
  | "50" | "100" | "200" | "300" | "400" 
  | "500" | "600" | "700" | "800" | "900"

export type FunctionalColorType = 
  | "success" | "warning" | "error" | "info"

export interface BrandColors {
  bizlink: Record<BizLinkColorVariant, string>
  functional: Record<FunctionalColorType, string>
}

// =============================================================================
// Component Variant Types
// =============================================================================

export type ButtonVariant = 
  | "default" | "destructive" | "outline" 
  | "secondary" | "ghost" | "link"

export type ButtonSize = 
  | "default" | "sm" | "lg" | "icon"

export type BadgeVariant = 
  | "default" | "secondary" | "destructive" | "outline"

export type AlertVariant = 
  | "default" | "destructive"

// =============================================================================
// Utility Types
// =============================================================================

export type ComponentWithAsChild<T = {}> = T & {
  asChild?: boolean
}

export type ComponentWithVariants<T, V> = T & VariantProps<V>

// =============================================================================
// Form Integration Types
// =============================================================================

export interface FormFieldContextValue<
  TFieldValues extends Record<string, any> = Record<string, any>,
  TName extends string = string
> {
  name: TName
}

export interface FormItemContextValue {
  id: string
}

export interface UseFormFieldReturn {
  id: string
  name: string
  formItemId: string
  formDescriptionId: string
  formMessageId: string
  invalid: boolean
  isDirty: boolean
  isTouched: boolean
  error?: { message?: string }
}

// =============================================================================
// Legacy Compatibility Types
// =============================================================================

/**
 * @deprecated Use ButtonProps instead
 */
export type LegacyButtonProps = ButtonProps

/**
 * @deprecated Use CardProps instead  
 */
export type LegacyCardProps = CardProps

/**
 * @deprecated Use InputProps instead
 */
export type LegacyInputProps = InputProps

// =============================================================================
// Component Ref Types
// =============================================================================

export type ButtonRef = React.ElementRef<"button">
export type CardRef = React.ElementRef<"div">
export type InputRef = React.ElementRef<"input">
export type LabelRef = React.ElementRef<typeof LabelPrimitive.Root>
export type DialogContentRef = React.ElementRef<typeof DialogPrimitive.Content>
export type SelectTriggerRef = React.ElementRef<typeof SelectPrimitive.Trigger>

// =============================================================================
// Export All Types
// =============================================================================

export type {
  // React Hook Form types for convenience
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
} from "react-hook-form"