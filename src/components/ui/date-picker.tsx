"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  selected?: Date
  onSelect?: (date: Date | null) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  disabledDates?: Date[]
  minDate?: Date
  maxDate?: Date
}

export function DatePicker({
  date,
  selected,
  onSelect,
  className,
  placeholder = "Select date",
  disabled = false,
  disabledDates,
  minDate,
  maxDate
}: DatePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date || selected)

  React.useEffect(() => {
    if (date) {
      setSelectedDate(date)
    } else if (selected) {
      setSelectedDate(selected)
    }
  }, [date, selected])

  const handleSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    if (onSelect) {
      onSelect(date || null)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={(date) => {
            const isDisabled = disabled || 
              (disabledDates && disabledDates.some(disabledDate => 
                disabledDate.toDateString() === date.toDateString()
              )) ||
              (minDate && date < minDate) ||
              (maxDate && date > maxDate)
            return isDisabled
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
} 