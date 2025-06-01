"use client"

import { AlertTriangle, X } from "lucide-react"
import { Button } from "./button"
import { Card, CardContent, CardFooter } from "./card"
import { useState, useEffect } from "react"

interface ErrorNotificationProps {
  title: string
  message: string
  onDismiss?: () => void
  autoHideDuration?: number
}

export function ErrorNotification({
  title,
  message,
  onDismiss,
  autoHideDuration = 5000,
}: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoHideDuration > 0) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, autoHideDuration)
      
      return () => clearTimeout(timer)
    }
  }, [autoHideDuration])

  const handleDismiss = () => {
    setIsVisible(false)
    if (onDismiss) {
      onDismiss()
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <Card className="border-destructive bg-destructive/10 shadow-sm animate-in fade-in slide-in-from-top-5 duration-300">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-destructive">{title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" 
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
