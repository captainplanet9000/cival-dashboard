"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"

interface AlertDestructiveProps {
  title?: string
  description: string
}

export function AlertDestructive({ 
  title = "Error", 
  description 
}: AlertDestructiveProps) {
  return (
    <div className="rounded-md border border-destructive bg-destructive/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <div>
          <h5 className="text-sm font-medium text-destructive">{title}</h5>
          <p className="text-sm text-destructive mt-1">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}
