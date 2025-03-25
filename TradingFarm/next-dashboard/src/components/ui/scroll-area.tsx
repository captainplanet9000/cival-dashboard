"use client"

import * as React from "react"

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { viewportClassName?: string }
>(({ className, children, viewportClassName, ...props }, ref) => (
  <div
    ref={ref}
    className={className}
    {...props}
  >
    <div className={viewportClassName || "h-full w-full overflow-auto"}>
      {children}
    </div>
  </div>
))
ScrollArea.displayName = "ScrollArea"

const ScrollBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "vertical" | "horizontal"
  }
>(({ className, orientation = "vertical", ...props }, ref) => (
  <div
    ref={ref}
    className={
      orientation === "vertical"
        ? "flex-none border-l border-border hover:bg-muted"
        : "flex-none border-t border-border hover:bg-muted"
    }
    {...props}
  />
))
ScrollBar.displayName = "ScrollBar"

export { ScrollArea, ScrollBar }
