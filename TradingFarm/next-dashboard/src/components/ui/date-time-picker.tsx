"use client"

import * as React from "react"
import { CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "./input"

interface DateTimePickerProps {
  value?: Date
  onChange?: (date?: Date) => void
  className?: string
}

export function DateTimePicker({
  value,
  onChange,
  className,
}: DateTimePickerProps) {
  const [selectedDateTime, setSelectedDateTime] = React.useState<Date | undefined>(value)
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)

  // Generate hours and minutes options
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  // Handle calendar date change
  const handleCalendarSelect = (date?: Date) => {
    if (!date) return

    const newDateTime = selectedDateTime
      ? new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          selectedDateTime.getHours(),
          selectedDateTime.getMinutes(),
          0
        )
      : new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          0,
          0,
          0
        )

    setSelectedDateTime(newDateTime)
    onChange?.(newDateTime)
  }

  // Handle hour change
  const handleHourChange = (hour: string) => {
    if (!selectedDateTime) return

    const newDateTime = new Date(selectedDateTime)
    newDateTime.setHours(parseInt(hour))
    setSelectedDateTime(newDateTime)
    onChange?.(newDateTime)
  }

  // Handle minute change
  const handleMinuteChange = (minute: string) => {
    if (!selectedDateTime) return

    const newDateTime = new Date(selectedDateTime)
    newDateTime.setMinutes(parseInt(minute))
    setSelectedDateTime(newDateTime)
    onChange?.(newDateTime)
  }

  // Handle manual time entry
  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = e.target.value
    
    if (!timeString || !selectedDateTime) return
    
    const [hoursStr, minutesStr] = timeString.split(':')
    const hours = parseInt(hoursStr)
    const minutes = parseInt(minutesStr)
    
    if (isNaN(hours) || isNaN(minutes)) return
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return
    
    const newDateTime = new Date(selectedDateTime)
    newDateTime.setHours(hours)
    newDateTime.setMinutes(minutes)
    setSelectedDateTime(newDateTime)
    onChange?.(newDateTime)
  }

  React.useEffect(() => {
    setSelectedDateTime(value)
  }, [value])

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDateTime && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDateTime ? (
              format(selectedDateTime, "PPP HH:mm")
            ) : (
              <span>Pick a date and time</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDateTime}
            onSelect={handleCalendarSelect}
            initialFocus
          />
          <div className="p-3 border-t">
            <div className="flex items-center justify-between space-x-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  className="w-[120px]"
                  value={selectedDateTime ? format(selectedDateTime, "HH:mm") : ""}
                  onChange={handleTimeInputChange}
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedDateTime(new Date())
                    onChange?.(new Date())
                  }}
                >
                  Now
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsPopoverOpen(false)
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
