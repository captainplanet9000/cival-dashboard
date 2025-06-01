"use client"

import * as React from "react"
import { ArrowDownUp, Clock, Tag, ArrowUp, ArrowDown, DollarSign, Percent, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"

export type OrderType = "market" | "limit" | "stop" | "stop_limit" | "trailing_stop"
export type OrderSide = "buy" | "sell"
export type OrderStatus = "open" | "filled" | "partial" | "canceled" | "rejected" | "expired"

export interface OrderCardProps {
  id: string
  orderId?: string
  symbol: string
  exchange?: string
  type: OrderType
  side: OrderSide
  status: OrderStatus
  price?: number
  amount: number
  filled?: number
  remaining?: number
  total?: number
  fee?: number
  createdAt: string | Date
  updatedAt?: string | Date
  className?: string
  onCancel?: () => void
  onEdit?: () => void
  onView?: () => void
  showActions?: boolean
  currency?: string
  baseCurrency?: string
  quoteCurrency?: string
}

export function OrderCard({
  id,
  orderId,
  symbol,
  exchange,
  type,
  side,
  status,
  price,
  amount,
  filled,
  remaining,
  total,
  fee,
  createdAt,
  updatedAt,
  className,
  onCancel,
  onEdit,
  onView,
  showActions = true,
  currency = "USD",
  baseCurrency,
  quoteCurrency,
}: OrderCardProps) {
  const formatDate = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleString()
  }

  const getStatusBadge = () => {
    switch (status) {
      case "open":
        return <Badge className="bg-blue-500">Open</Badge>
      case "filled":
        return <Badge className="bg-green-500">Filled</Badge>
      case "partial":
        return <Badge className="bg-yellow-500">Partial</Badge>
      case "canceled":
        return <Badge variant="secondary">Canceled</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      case "expired":
        return <Badge variant="outline">Expired</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getTypeLabel = () => {
    switch (type) {
      case "market": return "Market"
      case "limit": return "Limit"
      case "stop": return "Stop"
      case "stop_limit": return "Stop Limit"
      case "trailing_stop": return "Trailing Stop"
      default: return type
    }
  }

  const getSideBadge = () => {
    return side === "buy" ? (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-800 flex items-center gap-1">
        <ArrowUp className="h-3 w-3" />
        Buy
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-800 flex items-center gap-1">
        <ArrowDown className="h-3 w-3" />
        Sell
      </Badge>
    )
  }

  const getProgress = () => {
    if (filled === undefined || amount === 0) return 0
    return (filled / amount) * 100
  }

  const renderOrderDetails = () => {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Order Type</p>
            <p className="text-sm font-medium">{getTypeLabel()}</p>
          </div>
          
          {exchange && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Exchange</p>
              <p className="text-sm font-medium">{exchange}</p>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between">
            <p className="text-xs text-muted-foreground">Amount</p>
            {filled !== undefined && (
              <p className="text-xs text-muted-foreground">
                Filled: {filled} / {amount} {baseCurrency || ""}
              </p>
            )}
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full",
                side === "buy" ? "bg-green-500" : "bg-red-500"
              )}
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {price !== undefined && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Price</p>
              <p className="text-sm font-medium">
                {price} {quoteCurrency || currency}
              </p>
            </div>
          )}
          
          {total !== undefined && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-sm font-medium">
                {total} {quoteCurrency || currency}
              </p>
            </div>
          )}
        </div>

        {fee !== undefined && (
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Fee</p>
              <p className="text-sm">
                {fee} {quoteCurrency || currency}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <p className="text-xs">Created: {formatDate(createdAt)}</p>
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4" />
            <div>
              <CardTitle className="text-lg font-semibold">{symbol}</CardTitle>
              <CardDescription className="text-xs">
                {orderId && `Order ID: ${orderId.substring(0, 8)}...`}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {getSideBadge()}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        {renderOrderDetails()}
      </CardContent>
      {showActions && (status === "open" || status === "partial") && (
        <CardFooter className="flex gap-2 pt-2">
          {onCancel && (status === "open" || status === "partial") && (
            <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {onEdit && (status === "open") && (
            <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
              Edit
            </Button>
          )}
          {onView && (
            <Button variant="ghost" size="sm" className="flex-1" onClick={onView}>
              Details
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
