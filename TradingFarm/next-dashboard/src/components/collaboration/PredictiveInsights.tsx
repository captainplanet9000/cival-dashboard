"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  BarChart2,
  LineChart,
  RefreshCw,
  Download,
  Share2,
  Search,
  Zap,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Calendar
} from "lucide-react";

export function PredictiveInsights() {
  // State
  const [timeframe, setTimeframe] = useState("7d");
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [insightType, setInsightType] = useState("all");
  
  // Mock market predictions
  const marketPredictions = [
    {
      id: "pred-1",
      asset: "BTC",
      type: "trend",
      direction: "bullish",
      timeframe: "48h",
      confidence: 78,
      prediction: "Price likely to increase by 3-5% in the next 48 hours",
      reasoning: "Increased institutional buying pressure combined with decreasing exchange reserves",
      generatedAt: "2025-04-12T15:30:00Z",
      indicators: ["RSI", "OBV", "MACD"],
      votes: { up: 12, down: 3 },
      comments: 5
    },
    {
      id: "pred-2",
      asset: "ETH",
      type: "resistance",
      direction: "neutral",
      timeframe: "24h",
      confidence: 82,
      prediction: "Strong resistance level at $4,250, likely to consolidate",
      reasoning: "Multiple rejection tests at this level with decreasing volume",
      generatedAt: "2025-04-12T14:15:00Z",
      indicators: ["Fibonacci", "Volume Profile", "Support/Resistance"],
      votes: { up: 8, down: 1 },
      comments: 3
    },
    {
      id: "pred-3",
      asset: "BTC",
      type: "anomaly",
      direction: "caution",
      timeframe: "12h",
      confidence: 65,
      prediction: "Unusual options activity detected, potential increased volatility",
      reasoning: "Significant increase in put options at $65,000 strike price",
      generatedAt: "2025-04-12T16:45:00Z",
      indicators: ["Options Flow", "Volatility Index", "Open Interest"],
      votes: { up: 15, down: 2 },
      comments: 8
    }
  ];
  
  // Mock strategy insights
  const strategyInsights = [
    {
      id: "strat-1",
      strategyName: "Momentum Trader v2.1",
      type: "optimization",
      impact: "positive",
      confidence: 75,
      insight: "Parameter adjustment could improve win rate by ~4%",
      reasoning: "Backtesting shows increasing trailing stop distance improves performance in current market",
      generatedAt: "2025-04-12T12:30:00Z",
      votes: { up: 7, down: 1 },
      comments: 3
    },
    {
      id: "strat-2",
      strategyName: "Mean Reversion Specialist v1.8",
      type: "warning",
      impact: "negative",
      confidence: 83,
      insight: "Strategy performance may deteriorate in coming week",
      reasoning: "Historical performance shows weakness during similar market regimes of decreased volatility",
      generatedAt: "2025-04-12T10:15:00Z",
      votes: { up: 9, down: 0 },
      comments: 4
    },
    {
      id: "strat-3",
      strategyName: "Volatility Harvester v1.2",
      type: "opportunity",
      impact: "positive",
      confidence: 68,
      insight: "Optimal market conditions expected in 24-48 hours",
      reasoning: "VIX projections and market sentiment indicators suggest favorable volatility expansion",
      generatedAt: "2025-04-12T13:45:00Z",
      votes: { up: 5, down: 2 },
      comments: 1
    }
  ];
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Get prediction badge
  const getPredictionTypeBadge = (type: string) => {
    switch (type) {
      case "trend":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Trend</Badge>;
      case "resistance":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Resistance</Badge>;
      case "anomaly":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Anomaly</Badge>;
      case "optimization":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Optimization</Badge>;
      case "warning":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Warning</Badge>;
      case "opportunity":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Opportunity</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  // Get direction indicator
  const getDirectionIndicator = (direction: string) => {
    switch (direction) {
      case "bullish":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "bearish":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "neutral":
        return <BarChart2 className="h-4 w-4 text-blue-500" />;
      case "caution":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <BarChart2 className="h-4 w-4 text-blue-500" />;
    }
  };
  
  // Filter predictions based on current filters
  const getFilteredPredictions = () => {
    return marketPredictions.filter(pred => {
      if (selectedAsset !== "all" && pred.asset !== selectedAsset) return false;
      if (insightType !== "all" && pred.type !== insightType) return false;
      if (pred.confidence < confidenceThreshold) return false;
      return true;
    });
  };
  
  // Filter insights based on current filters
  const getFilteredInsights = () => {
    return strategyInsights.filter(insight => {
      if (insightType !== "all" && insight.type !== insightType) return false;
      if (insight.confidence < confidenceThreshold) return false;
      return true;
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Predictive Insights</h2>
          <p className="text-muted-foreground">
            AI-powered market predictions and strategy insights
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Zap className="h-4 w-4 mr-2" />
            Generate New Insights
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">AI Predictions</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <div className="text-sm text-muted-foreground flex items-center">
              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
              <span>+5 from yesterday</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Avg. Confidence</CardTitle>
            <CardDescription>All predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">76.2%</div>
            <div className="text-sm text-muted-foreground flex items-center">
              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
              <span>+2.1% from last week</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Accuracy Rate</CardTitle>
            <CardDescription>Past predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">82.5%</div>
            <div className="text-sm text-muted-foreground flex items-center">
              <LineChart className="h-4 w-4 mr-1" />
              <span>Based on 245 predictions</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Team Engagement</CardTitle>
            <CardDescription>Feedback on insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.3%</div>
            <div className="text-sm text-muted-foreground flex items-center">
              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
              <span>+5.2% from last month</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Insight Filters</CardTitle>
            <CardDescription>
              Refine AI predictions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">Asset</label>
              <Select
                value={selectedAsset}
                onValueChange={setSelectedAsset}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assets</SelectItem>
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                  <SelectItem value="SOL">Solana (SOL)</SelectItem>
                  <SelectItem value="XRP">Ripple (XRP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium">Insight Type</label>
              <Select
                value={insightType}
                onValueChange={setInsightType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="trend">Trend Prediction</SelectItem>
                  <SelectItem value="resistance">Support/Resistance</SelectItem>
                  <SelectItem value="anomaly">Anomaly Detection</SelectItem>
                  <SelectItem value="optimization">Strategy Optimization</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="opportunity">Opportunity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Confidence Threshold</label>
                <span className="text-sm">{confidenceThreshold}%</span>
              </div>
              <Slider
                value={[confidenceThreshold]}
                min={50}
                max={95}
                step={5}
                onValueChange={(value) => setConfidenceThreshold(value[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>50%</span>
                <span>95%</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium">Timeframe</label>
              <Select
                value={timeframe}
                onValueChange={setTimeframe}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Next 24 Hours</SelectItem>
                  <SelectItem value="3d">Next 3 Days</SelectItem>
                  <SelectItem value="7d">Next Week</SelectItem>
                  <SelectItem value="30d">Next Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Apply Filters</Button>
          </CardFooter>
        </Card>
        
        <div className="col-span-9">
          <Tabs defaultValue="market">
            <TabsList>
              <TabsTrigger value="market">
                <TrendingUp className="h-4 w-4 mr-2" />
                Market Predictions
              </TabsTrigger>
              <TabsTrigger value="strategy">
                <LineChart className="h-4 w-4 mr-2" />
                Strategy Insights
              </TabsTrigger>
              <TabsTrigger value="trends">
                <BarChart2 className="h-4 w-4 mr-2" />
                Emerging Trends
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="market" className="space-y-4 mt-4">
              {getFilteredPredictions().map((prediction) => (
                <Card key={prediction.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-lg">
                          {prediction.asset} {getPredictionTypeBadge(prediction.type)}
                        </div>
                        <div className="flex items-center text-sm">
                          {getDirectionIndicator(prediction.direction)}
                          <span className="ml-1 capitalize">{prediction.direction}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          <Clock className="h-3 w-3 mr-1" />
                          {prediction.timeframe}
                        </Badge>
                        <Badge variant={prediction.confidence >= 80 ? "default" : "outline"} className={
                          prediction.confidence >= 80 
                            ? "bg-green-500 hover:bg-green-500/80" 
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }>
                          {prediction.confidence}% confidence
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="font-medium">{prediction.prediction}</div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Reasoning:</span> {prediction.reasoning}
                      </div>
                      <div className="flex gap-2 mt-1">
                        {prediction.indicators.map((indicator, index) => (
                          <Badge key={index} variant="secondary" className="px-2 py-0">
                            {indicator}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-3 flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      Generated {formatDate(prediction.generatedAt)}
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          {prediction.votes.up}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <ThumbsDown className="h-3 w-3 mr-1" />
                          {prediction.votes.down}
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {prediction.comments}
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 px-2">
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="strategy" className="space-y-4 mt-4">
              {getFilteredInsights().map((insight) => (
                <Card key={insight.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-lg">
                          {insight.strategyName} {getPredictionTypeBadge(insight.type)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={insight.confidence >= 80 ? "default" : "outline"} className={
                          insight.confidence >= 80 
                            ? "bg-green-500 hover:bg-green-500/80" 
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }>
                          {insight.confidence}% confidence
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="font-medium">{insight.insight}</div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Reasoning:</span> {insight.reasoning}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-3 flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      Generated {formatDate(insight.generatedAt)}
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          {insight.votes.up}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <ThumbsDown className="h-3 w-3 mr-1" />
                          {insight.votes.down}
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {insight.comments}
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 px-2">
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="trends" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Emerging Market Trends</CardTitle>
                  <CardDescription>
                    AI-detected trends across timeframes and markets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground space-y-2">
                    <Calendar className="h-12 w-12 mx-auto opacity-20" />
                    <p>Trend analysis is scheduled for generation.</p>
                    <p className="text-sm">Refresh or check back in a few minutes.</p>
                    <Button className="mt-4">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate Trends Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
