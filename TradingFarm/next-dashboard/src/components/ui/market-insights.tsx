"use client"

import * as React from "react"
import { LineChart, TrendingUp, TrendingDown, BarChart2, Brain, RefreshCw, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AreaChartComponent } from "@/components/ui/chart"
import { cn } from "@/utils/cn"

export type InsightType = "trend" | "pattern" | "analysis" | "event" | "recommendation"
export type SentimentType = "bullish" | "bearish" | "neutral"
export type TimeframeType = "short" | "medium" | "long"

export interface MarketDataPoint {
  timestamp: string
  value: number
}

export interface MarketInsight {
  id: string
  title: string
  description: string
  type: InsightType
  sentiment: SentimentType
  timeframe: TimeframeType
  symbol?: string
  createdAt: string | Date
  source: string
  confidence: number
  data?: MarketDataPoint[]
  tags?: string[]
  relatedInsightIds?: string[]
}

interface MarketInsightsProps {
  insights: MarketInsight[]
  onRefresh?: () => Promise<void>
  onInsightSelect?: (insight: MarketInsight) => void
  onSearchInsights?: () => void
  className?: string
  isLoading?: boolean
  lastUpdated?: string | Date
}

export function MarketInsights({
  insights,
  onRefresh,
  onInsightSelect,
  onSearchInsights,
  className,
  isLoading = false,
  lastUpdated,
}: MarketInsightsProps) {
  const [activeTab, setActiveTab] = React.useState<string>("all")

  const formatDate = (date?: string | Date) => {
    if (!date) return ""
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleString()
  }

  const getFilteredInsights = () => {
    if (activeTab === "all") return insights
    
    switch (activeTab) {
      case "bullish":
        return insights.filter(insight => insight.sentiment === "bullish")
      case "bearish":
        return insights.filter(insight => insight.sentiment === "bearish")
      case "patterns":
        return insights.filter(insight => insight.type === "pattern")
      case "recommendations":
        return insights.filter(insight => insight.type === "recommendation")
      default:
        return insights
    }
  }

  const getSentimentBadge = (sentiment: SentimentType) => {
    switch (sentiment) {
      case "bullish":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Bullish
          </Badge>
        )
      case "bearish":
        return (
          <Badge className="bg-red-500 hover:bg-red-600 flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Bearish
          </Badge>
        )
      case "neutral":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <BarChart2 className="h-3 w-3" />
            Neutral
          </Badge>
        )
    }
  }

  const getTypeIcon = (type: InsightType) => {
    switch (type) {
      case "trend":
        return <LineChart className="h-4 w-4" />
      case "pattern":
        return <BarChart2 className="h-4 w-4" />
      case "analysis":
        return <Brain className="h-4 w-4" />
      case "event":
        return <RefreshCw className="h-4 w-4" />
      case "recommendation":
        return <TrendingUp className="h-4 w-4" />
      default:
        return <BarChart2 className="h-4 w-4" />
    }
  }

  const getTimeframeLabel = (timeframe: TimeframeType) => {
    switch (timeframe) {
      case "short":
        return "Short-term"
      case "medium":
        return "Medium-term"
      case "long":
        return "Long-term"
      default:
        return timeframe
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-500"
    if (confidence >= 60) return "text-yellow-500"
    return "text-red-500"
  }

  const filteredInsights = getFilteredInsights()

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              ElizaOS Market Insights
            </CardTitle>
            {lastUpdated && (
              <CardDescription>
                Last updated: {formatDate(lastUpdated)}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            {onSearchInsights && (
              <Button variant="outline" size="sm" onClick={onSearchInsights}>
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
            )}
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
                Refresh
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="bullish">Bullish</TabsTrigger>
            <TabsTrigger value="bearish">Bearish</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mr-2" />
            <p>Loading insights...</p>
          </div>
        ) : filteredInsights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No insights available for this filter</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredInsights.map((insight) => (
              <div 
                key={insight.id} 
                className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onInsightSelect?.(insight)}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      {getTypeIcon(insight.type)}
                    </div>
                    <div>
                      <h3 className="font-medium text-base">{insight.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {insight.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mt-3">
                        {getSentimentBadge(insight.sentiment)}
                        <Badge variant="outline" className="text-xs">
                          {getTimeframeLabel(insight.timeframe)}
                        </Badge>
                        {insight.symbol && (
                          <Badge variant="secondary" className="text-xs">
                            {insight.symbol}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <div>Source: {insight.source}</div>
                        <div className={getConfidenceColor(insight.confidence)}>
                          Confidence: {insight.confidence}%
                        </div>
                        <div>Generated: {formatDate(insight.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                  
                  {insight.data && insight.data.length > 0 && (
                    <div className="w-24 h-16 flex-shrink-0">
                      <AreaChartComponent
                        data={insight.data.map(d => ({
                          time: new Date(d.timestamp).toLocaleString(),
                          value: d.value
                        }))}
                        height={60}
                        areas={[
                          { 
                            dataKey: "value",
                            color: insight.sentiment === "bullish" 
                              ? "#10b981" 
                              : insight.sentiment === "bearish" 
                                ? "#ef4444" 
                                : "#3b82f6"
                          }
                        ]}
                        showXAxis={false}
                        showYAxis={false}
                        showGrid={false}
                        showLegend={false}
                        xAxisDataKey="time"
                        className="w-full h-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="py-3 px-4 flex justify-between">
        <Button variant="ghost" size="sm" onClick={() => window.open("#", "_blank")}>
          <Brain className="h-4 w-4 mr-1" />
          ElizaOS Knowledge Base
        </Button>
        <p className="text-xs text-muted-foreground">
          Powered by ElizaOS AI
        </p>
      </CardFooter>
    </Card>
  )
}
