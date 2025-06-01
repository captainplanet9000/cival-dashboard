"use client"

import * as React from "react"
import { X, Check, ChevronsUpDown } from "lucide-react"
import { Command as CommandPrimitive } from "cmdk"

import { cn } from "@/utils/cn"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup, CommandItem } from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type Option = {
  label: string
  value: string
  disable?: boolean
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  className?: string
  placeholder?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = "Select options",
  ...props
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleUnselect = (value: string) => {
    onChange(selected.filter((item) => item !== value))
  }

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen} {...props}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex min-h-10 w-full flex-wrap items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            className
          )}
          onClick={() => setOpen(!open)}
        >
          <div className="flex flex-wrap gap-1">
            {selected.length === 0 && (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {selected.map((selectedItem) => {
              const option = options.find((opt) => opt.value === selectedItem)
              if (!option) return null
              return (
                <Badge
                  key={selectedItem}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {option.label}
                  <button
                    className="rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(selectedItem)
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleUnselect(selectedItem)
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              )
            })}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command className="max-h-64">
          <CommandPrimitive.Input 
            placeholder="Search options..." 
            className="h-9 px-3"
          />
          <CommandGroup className="overflow-auto max-h-52">
            {options.map((option) => {
              const isSelected = selected.includes(option.value)
              return (
                <CommandItem
                  key={option.value}
                  disabled={option.disable}
                  onSelect={() => handleSelect(option.value)}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer px-3 py-2",
                    option.disable && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50"
                    )}
                  >
                    {isSelected ? <Check className="h-3 w-3" /> : null}
                  </div>
                  <span>{option.label}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
