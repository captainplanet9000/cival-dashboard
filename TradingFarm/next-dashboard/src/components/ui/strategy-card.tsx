"use client"

import * as React from "react"
import { TrendingUp, Clock, AlertCircle, BarChart2, PlayCircle, StopCircle, Settings, Brain, Copy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/utils/cn"
import { formatDate } from '@/utils/date-utils';

export type StrategyStatus = "active" | "inactive" | "backtest" | "error" | "optimizing"

export interface StrategyMetric {
  name: string
  value: string | number
  status?: "positive" | "negative" | "neutral"
}

export interface StrategyCardProps {
  id: string
  name: string
  description?: string
  status: StrategyStatus
  exchange?: string
  pair?: string
  profitLoss?: number
  metrics?: StrategyMetric[]
  lastRun?: string | Date
  runCount?: number
  className?: string
  onStart?: () => void
  onStop?: () => void
  onEdit?: () => void
  onBacktest?: () => void
  onOptimize?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  isElizaEnabled?: boolean
  onElizaToggle?: (enabled: boolean) => void
}

export function StrategyCard({
  id,
  name,
  description,
  status,
  exchange,
  pair,
  profitLoss,
  metrics = [],
  lastRun,
  runCount,
  className,
  onStart,
  onStop,
  onEdit,
  onBacktest,
  onOptimize,
  onDuplicate,
  onDelete,
  isElizaEnabled = false,
  onElizaToggle,
}: StrategyCardProps) {
  const isActive = status === "active"
  const isError = status === "error"
  const isOptimizing = status === "optimizing"
  const isBacktesting = status === "backtest"
  

  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 flex items-center gap-1">
            <PlayCircle className="h-3 w-3" />
            Active
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <StopCircle className="h-3 w-3" />
            Inactive
          </Badge>
        )
      case "backtest":
        return (
          <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 flex items-center gap-1">
            <BarChart2 className="h-3 w-3" />
            Backtesting
          </Badge>
        )
      case "optimizing":
        return (
          <Badge variant="secondary" className="bg-purple-500 hover:bg-purple-600 flex items-center gap-1">
            <Settings className="h-3 w-3" />
            Optimizing
          </Badge>
        )
      case "error":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">Unknown</Badge>
        )
    }
  }

  const getProfitLossColor = () => {
    if (!profitLoss) return "text-muted-foreground"
    return profitLoss >= 0 ? "text-green-500" : "text-red-500"
  }

  const getMetricColor = (status?: "positive" | "negative" | "neutral") => {
    if (!status) return "text-muted-foreground"
    switch (status) {
      case "positive": return "text-green-500"
      case "negative": return "text-red-500"
      case "neutral": return "text-blue-500"
      default: return "text-muted-foreground"
    }
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{name}</CardTitle>
            {description && (
              <CardDescription className="text-xs line-clamp-2">{description}</CardDescription>
            )}
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {exchange && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Exchange</p>
                <p className="text-sm font-medium">{exchange}</p>
              </div>
            )}
            {pair && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Trading Pair</p>
                <p className="text-sm font-medium">{pair}</p>
              </div>
            )}
          </div>

          {profitLoss !== undefined && (
            <div className="flex items-center gap-2">
              <TrendingUp className={cn("h-5 w-5", getProfitLossColor())} />
              <div>
                <p className="text-xs text-muted-foreground">Profit/Loss</p>
                <p className={cn("text-sm font-medium", getProfitLossColor())}>
                  {profitLoss >= 0 ? "+" : ""}{profitLoss}%
                </p>
              </div>
            </div>
          )}

          {metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {metrics.map((metric, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{metric.name}</p>
                  <p className={cn("text-sm font-medium", getMetricColor(metric.status))}>
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {lastRun && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Last Run</p>
                <p className="text-sm">{formatDate(lastRun)}</p>
              </div>
              {runCount !== undefined && (
                <div className="ml-auto">
                  <p className="text-xs text-muted-foreground">Run Count</p>
                  <p className="text-sm text-right">{runCount}</p>
                </div>
              )}
            </div>
          )}

          {onElizaToggle && (
            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span className="text-sm">ElizaOS AI</span>
              </div>
              <Switch 
                checked={isElizaEnabled}
                onCheckedChange={onElizaToggle}
                disabled={isBacktesting || isOptimizing}
              />
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 pt-2">
        {isActive && onStop && (
          <Button variant="outline" size="sm" onClick={onStop}>
            <StopCircle className="h-3.5 w-3.5 mr-1" />
            Stop
          </Button>
        )}
        {!isActive && !isBacktesting && !isOptimizing && onStart && (
          <Button variant="outline" size="sm" onClick={onStart}>
            <PlayCircle className="h-3.5 w-3.5 mr-1" />
            Start
          </Button>
        )}
        {onBacktest && !isBacktesting && !isActive && (
          <Button variant="outline" size="sm" onClick={onBacktest}>
            <BarChart2 className="h-3.5 w-3.5 mr-1" />
            Backtest
          </Button>
        )}
        {onOptimize && !isOptimizing && !isActive && (
          <Button variant="outline" size="sm" onClick={onOptimize}>
            <Settings className="h-3.5 w-3.5 mr-1" />
            Optimize
          </Button>
        )}
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
        )}
        {onDuplicate && (
          <Button variant="ghost" size="sm" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5 mr-1" />
            Duplicate
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
            Delete
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
