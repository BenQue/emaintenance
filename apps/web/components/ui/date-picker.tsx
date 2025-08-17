"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { zhCN } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  dateFormat?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "选择日期",
  className,
  disabled = false,
  dateFormat = "yyyy-MM-dd"
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, dateFormat, { locale: zhCN }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date)
            setOpen(false)
          }}
          captionLayout="dropdown"
          defaultMonth={value}
          locale={zhCN}
        />
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onStartDateChange?: (date: Date | undefined) => void
  onEndDateChange?: (date: Date | undefined) => void
  startPlaceholder?: string
  endPlaceholder?: string
  className?: string
  disabled?: boolean
  dateFormat?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startPlaceholder = "开始日期",
  endPlaceholder = "结束日期",
  className,
  disabled = false,
  dateFormat = "yyyy-MM-dd"
}: DateRangePickerProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      <DatePicker
        value={startDate}
        onChange={onStartDateChange}
        placeholder={startPlaceholder}
        disabled={disabled}
        dateFormat={dateFormat}
        className="flex-1"
      />
      <DatePicker
        value={endDate}
        onChange={onEndDateChange}
        placeholder={endPlaceholder}
        disabled={disabled}
        dateFormat={dateFormat}
        className="flex-1"
      />
    </div>
  )
}