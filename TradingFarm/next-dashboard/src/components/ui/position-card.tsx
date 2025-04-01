"use client"

import * as React from "react"
import { TrendingUp, TrendingDown, Clock, DollarSign, Percent, BarChart2, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/utils/cn"

export type PositionDirection = "long" | "short"
export type PositionStatus = "open" | "closed" | "liquidated"

export interface PositionCardProps {
  id: string
  positionId?: string
  symbol: string
  exchange?: string
  direction: PositionDirection
  status: PositionStatus
  openPrice: number
  currentPrice?: number
  size: number
  leverage?: number
  margin?: number
  liquidationPrice?: number
  unrealizedPnl?: number
  unrealizedPnlPercent?: number
  takeProfit?: number
  stopLoss?: number
  openedAt: string | Date
  closedAt?: string | Date
  className?: string
  onClose?: () => void
  onModify?: () => void
  onView?: () => void
  showActions?: boolean
  currency?: string
  baseCurrency?: string
  quoteCurrency?: string
}

export function PositionCard({
  id,
  positionId,
  symbol,
  exchange,
  direction,
  status,
  openPrice,
  currentPrice,
  size,
  leverage,
  margin,
  liquidationPrice,
  unrealizedPnl,
  unrealizedPnlPercent,
  takeProfit,
  stopLoss,
  openedAt,
  closedAt,
  className,
  onClose,
  onModify,
  onView,
  showActions = true,
  currency = "USD",
  baseCurrency,
  quoteCurrency,
}: PositionCardProps) {
  const formatDate = (date?: string | Date) => {
    if (!date) return ""
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleString()
  }

  const formatCurrency = (value: number, currencyCode = currency) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const getPnlBadge = () => {
    if (unrealizedPnl === undefined || unrealizedPnlPercent === undefined) return null
    
    const isPositive = unrealizedPnl >= 0
    
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "font-medium flex items-center gap-1",
          isPositive 
            ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-800" 
            : "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-800"
        )}
      >
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? "+" : ""}{unrealizedPnlPercent.toFixed(2)}%
      </Badge>
    )
  }

  const getDirectionBadge = () => {
    return direction === "long" ? (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-800 flex items-center gap-1">
        <TrendingUp className="h-3 w-3" />
        Long
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-800 flex items-center gap-1">
        <TrendingDown className="h-3 w-3" />
        Short
      </Badge>
    )
  }

  const getStatusBadge = () => {
    switch (status) {
      case "open":
        return <Badge className="bg-blue-500">Open</Badge>
      case "closed":
        return <Badge variant="secondary">Closed</Badge>
      case "liquidated":
        return <Badge variant="destructive">Liquidated</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getLiquidationProgress = () => {
    if (!currentPrice || !liquidationPrice || !openPrice) return 0
    
    // For long positions
    if (direction === "long") {
      // Distance from entry to liquidation
      const totalDistance = openPrice - liquidationPrice
      // Distance from current to liquidation
      const currentDistance = currentPrice - liquidationPrice
      
      // Calculate percentage (how far from liquidation)
      return Math.max(0, Math.min(100, (currentDistance / totalDistance) * 100))
    }
    // For short positions
    else {
      // Distance from entry to liquidation
      const totalDistance = liquidationPrice - openPrice
      // Distance from current to liquidation
      const currentDistance = liquidationPrice - currentPrice
      
      // Calculate percentage (how far from liquidation)
      return Math.max(0, Math.min(100, (currentDistance / totalDistance) * 100))
    }
  }

  const renderPositionDetails = () => {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          {exchange && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Exchange</p>
              <p className="text-sm font-medium">{exchange}</p>
            </div>
          )}
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Size</p>
            <p className="text-sm font-medium">
              {size} {baseCurrency || ""}
              {leverage && leverage > 1 && (
                <span className="ml-1 text-xs text-muted-foreground">(x{leverage})</span>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Entry Price</p>
            <p className="text-sm font-medium">
              {formatCurrency(openPrice, quoteCurrency)}
            </p>
          </div>
          
          {currentPrice !== undefined && status === "open" && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Current Price</p>
              <p className={cn(
                "text-sm font-medium",
                direction === "long" 
                  ? (currentPrice > openPrice ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
                  : (currentPrice < openPrice ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
              )}>
                {formatCurrency(currentPrice, quoteCurrency)}
              </p>
            </div>
          )}
        </div>

        {margin !== undefined && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Margin</p>
            <p className="text-sm font-medium">
              {formatCurrency(margin, currency)}
            </p>
          </div>
        )}

        {unrealizedPnl !== undefined && status === "open" && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Unrealized PnL</p>
            <p className={cn(
              "text-sm font-medium",
              unrealizedPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {unrealizedPnl >= 0 ? "+" : ""}{formatCurrency(unrealizedPnl, currency)}
            </p>
          </div>
        )}

        {liquidationPrice !== undefined && status === "open" && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="text-xs text-muted-foreground">Distance to Liquidation</p>
              <p className="text-xs">
                Liq. Price: {formatCurrency(liquidationPrice, quoteCurrency)}
              </p>
            </div>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full",
                  getLiquidationProgress() < 25 ? "bg-red-500" : 
                  getLiquidationProgress() < 50 ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${getLiquidationProgress()}%` }}
              />
            </div>
          </div>
        )}

        {(takeProfit !== undefined || stopLoss !== undefined) && status === "open" && (
          <div className="grid grid-cols-2 gap-4">
            {takeProfit !== undefined && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Take Profit</p>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(takeProfit, quoteCurrency)}
                </p>
              </div>
            )}
            
            {stopLoss !== undefined && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Stop Loss</p>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  {formatCurrency(stopLoss, quoteCurrency)}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <p className="text-xs">Opened: {formatDate(openedAt)}</p>
        </div>
        
        {closedAt && status !== "open" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <p className="text-xs">Closed: {formatDate(closedAt)}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <div>
              <CardTitle className="text-lg font-semibold">{symbol}</CardTitle>
              <CardDescription className="text-xs">
                {positionId && `Position ID: ${positionId.substring(0, 8)}...`}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {getDirectionBadge()}
            {getStatusBadge()}
            {getPnlBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        {renderPositionDetails()}
      </CardContent>
      {showActions && status === "open" && (
        <CardFooter className="flex gap-2 pt-2">
          {onClose && (
            <Button 
              variant="default" 
              size="sm" 
              className={cn(
                "flex-1",
                direction === "long" 
                  ? (unrealizedPnl && unrealizedPnl >= 0 ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700")
                  : (unrealizedPnl && unrealizedPnl >= 0 ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700")
              )} 
              onClick={onClose}
            >
              Close Position
            </Button>
          )}
          {onModify && (
            <Button variant="outline" size="sm" className="flex-1" onClick={onModify}>
              Modify
            </Button>
          )}
          {onView && (
            <Button variant="ghost" size="sm" className="w-8 px-0 flex-none" onClick={onView}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
