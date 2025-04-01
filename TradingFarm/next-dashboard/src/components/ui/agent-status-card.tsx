"use client"

import * as React from "react"
import { Activity, Brain, TrendingUp, AlertCircle, CheckCircle, Clock, Zap } from "lucide-react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"

export type AgentStatus = "active" | "idle" | "learning" | "error" | "paused"

export interface AgentStatusCardProps {
  agentName: string
  agentId: string
  status: AgentStatus
  lastActive?: string | Date
  cpuUsage?: number
  memoryUsage?: number
  strategiesCount?: number
  successRate?: number
  tradesCount?: number
  className?: string
  onPause?: () => void
  onResume?: () => void
  onReset?: () => void
  onConnect?: () => void
}

export function AgentStatusCard({
  agentName,
  agentId,
  status,
  lastActive,
  cpuUsage,
  memoryUsage,
  strategiesCount,
  successRate,
  tradesCount,
  className,
  onPause,
  onResume,
  onReset,
  onConnect,
}: AgentStatusCardProps) {
  const { theme } = useTheme()
  const isActive = status === "active"
  const isError = status === "error"
  const isPaused = status === "paused"
  const isLearning = status === "learning"
  
  const formatDate = (date?: string | Date) => {
    if (!date) return "Never"
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleString()
  }

  const getStatusColor = () => {
    switch (status) {
      case "active": return "bg-green-500"
      case "idle": return "bg-gray-500"
      case "learning": return "bg-blue-500"
      case "error": return "bg-red-500"
      case "paused": return "bg-yellow-500"
      default: return "bg-gray-500"
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "active": return <Zap className="h-4 w-4" />
      case "idle": return <Clock className="h-4 w-4" />
      case "learning": return <Brain className="h-4 w-4" />
      case "error": return <AlertCircle className="h-4 w-4" />
      case "paused": return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case "active": return "Active"
      case "idle": return "Idle"
      case "learning": return "Learning"
      case "error": return "Error"
      case "paused": return "Paused"
      default: return "Unknown"
    }
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{agentName}</CardTitle>
            <CardDescription className="text-xs">ID: {agentId}</CardDescription>
          </div>
          <Badge 
            variant={isError ? "destructive" : isActive ? "default" : "secondary"}
            className="flex items-center gap-1"
          >
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last Active</p>
              <p className="text-sm font-medium">{formatDate(lastActive)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Strategies</p>
              <p className="text-sm font-medium">{strategiesCount || 0}</p>
            </div>
          </div>

          {(cpuUsage !== undefined || memoryUsage !== undefined) && (
            <div className="space-y-3">
              {cpuUsage !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">CPU Usage</span>
                    <span className="font-medium">{cpuUsage}%</span>
                  </div>
                  <Progress value={cpuUsage} className="h-1" />
                </div>
              )}
              
              {memoryUsage !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Memory Usage</span>
                    <span className="font-medium">{memoryUsage}%</span>
                  </div>
                  <Progress value={memoryUsage} className="h-1" />
                </div>
              )}
            </div>
          )}

          {(successRate !== undefined || tradesCount !== undefined) && (
            <div className="grid grid-cols-2 gap-4">
              {successRate !== undefined && (
                <div className="flex items-center gap-2">
                  <CheckCircle className={cn(
                    "h-8 w-8",
                    successRate >= 70 ? "text-green-500" : 
                    successRate >= 50 ? "text-yellow-500" : "text-red-500"
                  )} />
                  <div>
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                    <p className="text-sm font-medium">{successRate}%</p>
                  </div>
                </div>
              )}
              
              {tradesCount !== undefined && (
                <div className="flex items-center gap-2">
                  <Activity className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Trades</p>
                    <p className="text-sm font-medium">{tradesCount}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-2 pt-2">
        {isActive && onPause && (
          <Button variant="outline" size="sm" className="flex-1" onClick={onPause}>
            Pause
          </Button>
        )}
        {isPaused && onResume && (
          <Button variant="outline" size="sm" className="flex-1" onClick={onResume}>
            Resume
          </Button>
        )}
        {onReset && (
          <Button 
            variant={isError ? "default" : "outline"} 
            size="sm" 
            className={cn("flex-1", isError && "bg-red-500 hover:bg-red-600")}
            onClick={onReset}
          >
            Reset
          </Button>
        )}
        {onConnect && (
          <Button variant="default" size="sm" className="flex-1" onClick={onConnect}>
            Connect
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
