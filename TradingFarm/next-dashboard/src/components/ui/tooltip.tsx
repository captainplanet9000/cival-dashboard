"use client"

import * as React from "react"

// Simple implementation of a Tooltip without Radix dependency
const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  return <>{children}</>
}

interface TooltipProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Tooltip: React.FC<TooltipProps> = ({ 
  children, 
  open, 
  defaultOpen, 
  onOpenChange 
}) => {
  return <>{children}</>
}

const TooltipTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean }
>(({ asChild, ...props }, ref) => {
  const Comp = asChild ? React.cloneElement(
    React.Children.only(props.children as React.ReactElement),
    { ref, ...props }
  ) : <span ref={ref as React.Ref<HTMLSpanElement>} {...props} />
  
  return Comp
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    sideOffset?: number;
    align?: "start" | "center" | "end";
    side?: "top" | "right" | "bottom" | "left";
  }
>(({ className, sideOffset = 4, ...props }, ref) => (
  <div
    ref={ref}
    style={{ position: 'absolute', zIndex: 50 }}
    className={`z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className || ''}`}
    {...props}
  />
))
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
