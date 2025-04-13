"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { 
  TrendingUp, TrendingDown, AlertTriangle, BarChart2, Activity, 
  RefreshCw, Clock, LineChart as LineChartIcon, ArrowUpRight, 
  ArrowDownRight, ExternalLink, Bell, BellOff
} from "lucide-react";

interface MarketConditionProps {
  symbol?: string;
}

// Market sentiment and condition data
const MARKET_CONDITIONS = {
  trend: 'bullish', // bullish, bearish, neutral, mixed
  volatility: 'medium', // low, medium, high, extreme
  strength: 72, // 0-100
  sentiment: 64, // 0-100
  warnings: [
    { id: 'w1', type: 'divergence', severity: 'medium', message: 'RSI divergence detected on 4H timeframe' },
    { id: 'w2', type: 'volatility', severity: 'high', message: 'Increasing volatility above historical average' }
  ],
  patterns: [
    { id: 'p1', name: 'Bull Flag', confidence: 82, timeframe: '1D', status: 'forming' },
    { id: 'p2', name: 'Support Test', confidence: 91, timeframe: '4H', status: 'confirmed' }
  ]
};

// Market price data for visualization
const PRICE_DATA = Array.from({ length: 30 }, (_, i) => ({
  date: `2025-03-${14 + i}`,
  price: 45000 + Math.sin(i / 3) * 2000 + i * 100 + (Math.random() * 500 - 250),
  sentiment: 50 + Math.sin(i / 4) * 20 + (Math.random() * 10 - 5),
}));

// Market indicators data
const INDICATOR_DATA = Array.from({ length: 30 }, (_, i) => ({
  date: `2025-03-${14 + i}`,
  rsi: 50 + Math.sin(i / 5) * 20,
  momentum: 40 + Math.cos(i / 4) * 30 + i * 0.5,
  volume: 100 + Math.sin(i / 2) * 50 + (i > 20 ? 100 : 0),
}));

export function MarketConditionAnalysis({ symbol = "BTC/USD" }: MarketConditionProps) {
  const [activeTab, setActiveTab] = useState("sentiment");
  const [timeframe, setTimeframe] = useState("1D");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Helper function to get sentiment badge variant
  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return (
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
            <TrendingUp className="h-3.5 w-3.5 mr-1" />
            Bullish
          </Badge>
        );
      case 'bearish':
        return (
          <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20">
            <TrendingDown className="h-3.5 w-3.5 mr-1" />
            Bearish
          </Badge>
        );
      case 'neutral':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Activity className="h-3.5 w-3.5 mr-1" />
            Neutral
          </Badge>
        );
      case 'mixed':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-100/50">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Mixed
          </Badge>
        );
      default:
        return <Badge variant="outline">{sentiment}</Badge>;
    }
  };
  
  // Helper to get severity badge
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Low</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Medium</Badge>;
      case 'high':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">High</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Market Condition Analysis</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15m">15 Minutes</SelectItem>
              <SelectItem value="1H">1 Hour</SelectItem>
              <SelectItem value="4H">4 Hours</SelectItem>
              <SelectItem value="1D">1 Day</SelectItem>
              <SelectItem value="1W">1 Week</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{symbol}</CardTitle>
                <CardDescription>
                  Current market price and sentiment
                </CardDescription>
              </div>
              {getSentimentBadge(MARKET_CONDITIONS.trend)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={PRICE_DATA}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'price') return [`$${value.toLocaleString()}`, 'Price'];
                      if (name === 'sentiment') return [`${value}%`, 'Sentiment'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sentiment" 
                    stroke="#10b981" 
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    yAxisId="right"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Market Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Market Trend</span>
                {getSentimentBadge(MARKET_CONDITIONS.trend)}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Volatility</span>
                <Badge variant="outline" className="capitalize">{MARKET_CONDITIONS.volatility}</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Last Updated</span>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Trend Strength</span>
                <span className="text-sm font-medium">{MARKET_CONDITIONS.strength}%</span>
              </div>
              <Progress value={MARKET_CONDITIONS.strength} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Market Sentiment</span>
                <span className="text-sm font-medium">{MARKET_CONDITIONS.sentiment}%</span>
              </div>
              <Progress value={MARKET_CONDITIONS.sentiment} className="h-2" />
            </div>
            
            <div className="space-y-1">
              <span className="text-sm font-medium">Detected Patterns</span>
              {MARKET_CONDITIONS.patterns.map(pattern => (
                <div key={pattern.id} className="flex justify-between items-center p-2 bg-muted/40 rounded">
                  <div>
                    <div className="font-medium text-sm">{pattern.name}</div>
                    <div className="text-xs text-muted-foreground">{pattern.timeframe} - {pattern.status}</div>
                  </div>
                  <Badge variant="outline">{pattern.confidence}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sentiment" className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            <span>Sentiment Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="indicators" className="flex items-center gap-1">
            <LineChartIcon className="h-4 w-4" />
            <span>Technical Indicators</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1">
            <Bell className="h-4 w-4" />
            <span>Alerts</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="sentiment" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Sentiment</CardTitle>
              <CardDescription>Sentiment metrics across sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { source: 'Social Media', bullish: 62, bearish: 38 },
                      { source: 'News', bullish: 55, bearish: 45 },
                      { source: 'On-Chain', bullish: 78, bearish: 22 },
                      { source: 'Institutional', bullish: 70, bearish: 30 },
                      { source: 'Technical', bullish: 58, bearish: 42 },
                    ]}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="source" width={100} />
                    <Tooltip formatter={(value) => [`${value}%`, '']} />
                    <Legend />
                    <Bar dataKey="bullish" name="Bullish" stackId="a" fill="#10b981" />
                    <Bar dataKey="bearish" name="Bearish" stackId="a" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="indicators" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Technical Indicators</CardTitle>
              <CardDescription>Key indicators and patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={INDICATOR_DATA}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number, name: string) => [value.toFixed(2), name]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="rsi" name="RSI" stroke="#2563eb" />
                    <Line type="monotone" dataKey="momentum" name="Momentum" stroke="#10b981" />
                    <Line type="monotone" dataKey="volume" name="Volume" stroke="#f59e0b" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 mt-4 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Moving Averages</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-muted/40 rounded">
                      <span className="text-sm">SMA (50)</span>
                      <div className="flex items-center gap-1 text-green-600">
                        <ArrowUpRight className="h-4 w-4" />
                        <span>$46,320</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted/40 rounded">
                      <span className="text-sm">EMA (200)</span>
                      <div className="flex items-center gap-1 text-green-600">
                        <ArrowUpRight className="h-4 w-4" />
                        <span>$42,158</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted/40 rounded">
                      <span className="text-sm">VWAP</span>
                      <div className="flex items-center gap-1 text-red-600">
                        <ArrowDownRight className="h-4 w-4" />
                        <span>$46,890</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Oscillators</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-muted/40 rounded">
                      <span className="text-sm">RSI (14)</span>
                      <Badge className={
                        INDICATOR_DATA[INDICATOR_DATA.length-1].rsi > 70 
                          ? "bg-red-500/10 text-red-600" 
                          : INDICATOR_DATA[INDICATOR_DATA.length-1].rsi < 30 
                            ? "bg-green-500/10 text-green-600" 
                            : "bg-blue-500/10 text-blue-600"
                      }>
                        {INDICATOR_DATA[INDICATOR_DATA.length-1].rsi.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted/40 rounded">
                      <span className="text-sm">MACD</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">Bullish</Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted/40 rounded">
                      <span className="text-sm">Stochastic</span>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700">Neutral</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="alerts" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Market Alerts</span>
                <Badge className="ml-2">{MARKET_CONDITIONS.warnings.length} Active</Badge>
              </CardTitle>
              <CardDescription>Warnings and notable events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {MARKET_CONDITIONS.warnings.map(warning => (
                <Alert key={warning.id} variant="outline" className="border-amber-200 bg-amber-50/50">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  <AlertTitle className="flex items-center gap-2 text-amber-700">
                    {warning.type.charAt(0).toUpperCase() + warning.type.slice(1)} Warning
                    {getSeverityBadge(warning.severity)}
                  </AlertTitle>
                  <AlertDescription>
                    {warning.message}
                  </AlertDescription>
                </Alert>
              ))}
              
              <div className="pt-2">
                <h4 className="text-sm font-medium mb-2">Recent Events</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">Support level test</div>
                      <div className="text-xs text-muted-foreground">Price testing support at $45,200</div>
                    </div>
                    <div className="text-xs text-muted-foreground">5m ago</div>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">Increasing buy pressure</div>
                      <div className="text-xs text-muted-foreground">Volume spike detected on 15m timeframe</div>
                    </div>
                    <div className="text-xs text-muted-foreground">18m ago</div>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">RSI divergence resolved</div>
                      <div className="text-xs text-muted-foreground">Previous bearish divergence now resolved</div>
                    </div>
                    <div className="text-xs text-muted-foreground">43m ago</div>
                  </div>
                </div>
              </div>
              
              <Button variant="outline" className="w-full" asChild>
                <a href="#" className="flex items-center justify-center">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View All Market Events
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
