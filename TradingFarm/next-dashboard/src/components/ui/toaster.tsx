"use client"

import * as React from "react" 
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import type { ToastProps } from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  // Memoize the toast elements to prevent unnecessary re-renders
  const toastElements = React.useMemo(() => 
    toasts.map(function ({ id, title, description, action, ...props }: ToastProps & { 
      id: string;
      title?: React.ReactNode;
      description?: React.ReactNode;
      action?: React.ReactNode;
    }) {
      return (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && (
              <ToastDescription>{description}</ToastDescription>
            )}
          </div>
          {action}
          <ToastClose />
        </Toast>
      )
    }), [toasts]
  )

  return (
    <ToastProvider>
      {toastElements}
      <ToastViewport />
    </ToastProvider>
  )
}
