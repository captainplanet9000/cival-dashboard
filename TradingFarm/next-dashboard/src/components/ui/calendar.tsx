"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/utils/cn"
import { Button } from "@/components/ui/button"

// Simplified calendar component that doesn't rely on react-day-picker
export type CalendarProps = React.HTMLAttributes<HTMLDivElement> & {
  mode?: 'single' | 'range' | 'multiple';
  selected?: any;
  onSelect?: (date: any) => void;
  disabled?: boolean;
  initialFocus?: boolean;
  numberOfMonths?: number;
  defaultMonth?: Date;
}

function Calendar({
  className,
  mode = 'single',
  selected,
  onSelect,
  disabled = false,
  initialFocus = false,
  numberOfMonths = 1,
  defaultMonth = new Date(),
  ...props
}: CalendarProps) {
  return (
    <div className={cn("p-3 flex flex-col", className)} {...props}>
      <div className="flex justify-between items-center">
        <Button variant="outline" size="icon" className="h-7 w-7">
          <ChevronLeftIcon className="h-4 w-4" />
          <span className="sr-only">Previous month</span>
        </Button>
        <h2 className="text-sm font-medium">
          {defaultMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <Button variant="outline" size="icon" className="h-7 w-7">
          <ChevronRightIcon className="h-4 w-4" />
          <span className="sr-only">Next month</span>
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-7 text-center text-xs leading-6 text-muted-foreground">
        <div>Su</div>
        <div>Mo</div>
        <div>Tu</div>
        <div>We</div>
        <div>Th</div>
        <div>Fr</div>
        <div>Sa</div>
      </div>
      <div className="mt-2 grid grid-cols-7 text-center">
        {Array.from({ length: 31 }, (_, i) => (
          <div key={i} className="p-0 relative focus-within:relative focus-within:z-20">
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 font-normal"
              disabled={disabled}
            >
              {i + 1 <= 31 ? i + 1 : ''}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
