"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { 
  ChevronUp, ChevronDown, Maximize2, LineChart as LineChartIcon, 
  BarChart2, CandlestickChart, History, ZoomIn, ZoomOut
} from "lucide-react";

interface CandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketDataChartProps {
  symbol: string;
  data: CandleData[];
  indicators?: {
    name: string;
    data: any[];
    color: string;
  }[];
  trades?: {
    timestamp: string;
    type: 'buy' | 'sell';
    price: number;
    amount: number;
  }[];
  events?: {
    timestamp: string;
    type: string;
    description: string;
  }[];
}

export function MarketDataChart({
  symbol = "BTC/USD",
  data = [],
  indicators = [],
  trades = [],
  events = []
}: MarketDataChartProps) {
  const [chartType, setChartType] = useState<string>("candle");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  
  // Generate mock data if none provided
  const mockData = data.length > 0 ? data : Array.from({ length: 100 }, (_, i) => {
    const basePrice = 45000;
    const dayOffset = i * 0.5;
    const volatility = i / 10;
    
    const open = basePrice + Math.sin(i / 10) * 1000 + (Math.random() * volatility * 100);
    const close = open + (Math.random() * volatility * 200 - volatility * 100);
    const high = Math.max(open, close) + Math.random() * volatility * 100;
    const low = Math.min(open, close) - Math.random() * volatility * 100;
    
    return {
      timestamp: new Date(2025, 3, 1 + dayOffset).toISOString(),
      open,
      high,
      close,
      low,
      volume: Math.random() * 1000 + 500
    };
  });

  // Format the data for different chart types
  const lineData = mockData.map(candle => ({
    timestamp: candle.timestamp,
    price: candle.close,
    volume: candle.volume
  }));

  // Available indicators
  const availableIndicators = [
    { name: "SMA (50)", value: "sma50" },
    { name: "EMA (200)", value: "ema200" },
    { name: "RSI (14)", value: "rsi" },
    { name: "MACD", value: "macd" },
    { name: "Bollinger Bands", value: "bb" }
  ];

  // Handle zoom in/out
  const handleZoomIn = () => {
    setZoomLevel(Math.min(zoomLevel + 20, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(Math.max(zoomLevel - 20, 40));
  };

  // Chart domain based on zoom level
  const visibleDataPoints = Math.floor(mockData.length * (100 / zoomLevel));
  const startIndex = Math.max(0, mockData.length - visibleDataPoints);
  const visibleData = mockData.slice(startIndex);

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Custom tooltip component
  const CandleTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    const priceChange = data.close - data.open;
    const percentChange = (priceChange / data.open) * 100;
    
    return (
      <div className="bg-background p-3 border rounded-md shadow-md">
        <p className="text-sm font-medium">{formatTimestamp(data.timestamp)}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
          <div className="text-xs text-muted-foreground">Open</div>
          <div className="text-xs text-right">${data.open.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          
          <div className="text-xs text-muted-foreground">High</div>
          <div className="text-xs text-right">${data.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          
          <div className="text-xs text-muted-foreground">Low</div>
          <div className="text-xs text-right">${data.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          
          <div className="text-xs text-muted-foreground">Close</div>
          <div className="text-xs text-right">${data.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          
          <div className="text-xs text-muted-foreground">Change</div>
          <div className={`text-xs text-right ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${Math.abs(priceChange).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({percentChange.toFixed(2)}%)
          </div>
          
          <div className="text-xs text-muted-foreground">Volume</div>
          <div className="text-xs text-right">{data.volume.toLocaleString()}</div>
        </div>
      </div>
    );
  };
  
  // Calculate current price and change
  const currentPrice = mockData.length > 0 ? mockData[mockData.length - 1].close : 0;
  const previousPrice = mockData.length > 1 ? mockData[mockData.length - 2].close : currentPrice;
  const priceChange = currentPrice - previousPrice;
  const percentChange = (priceChange / previousPrice) * 100;

  // Create custom candle chart (simplified for this implementation)
  const renderCandleStickChart = () => {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={visibleData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(timestamp) => formatTimestamp(timestamp)}
            minTickGap={50}
          />
          <YAxis 
            domain={['auto', 'auto']}
            tickFormatter={(value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          />
          <Tooltip content={<CandleTooltip />} />
          <Area 
            type="monotone" 
            dataKey="close" 
            stroke="#2563eb" 
            fill="url(#colorClose)" 
            strokeWidth={2}
          />
          <defs>
            <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          {/* Render trades if available */}
          {trades.map((trade, index) => {
            const tradeTimestampStr = trade.timestamp;
            const matchingCandle = visibleData.find(candle => candle.timestamp === tradeTimestampStr);
            
            if (!matchingCandle) return null;
            
            return (
              <ReferenceLine 
                key={`trade-${index}`}
                x={matchingCandle.timestamp} 
                stroke={trade.type === 'buy' ? '#22c55e' : '#ef4444'} 
                strokeDasharray="3 3"
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  // Create volume chart
  const renderVolumeChart = () => {
    return (
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={visibleData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(timestamp) => formatTimestamp(timestamp)}
            minTickGap={50}
            hide
          />
          <YAxis 
            tickFormatter={(value) => `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          />
          <Tooltip 
            formatter={(value: any) => [`${value.toLocaleString()}`, 'Volume']}
            labelFormatter={(timestamp) => formatTimestamp(timestamp)}
          />
          <Bar 
            dataKey="volume" 
            fill="#9ca3af" 
            opacity={0.5} 
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>{symbol}</CardTitle>
              <Badge 
                variant={priceChange >= 0 ? "default" : "destructive"}
                className="font-mono"
              >
                {priceChange >= 0 ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                {percentChange.toFixed(2)}%
              </Badge>
            </div>
            <CardDescription className="flex items-center mt-1">
              <span className="font-mono text-lg font-medium mr-2">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-xs ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceChange >= 0 ? '+' : '-'}${Math.abs(priceChange).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <div>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-[150px] h-8">
                  <SelectValue placeholder="Chart Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">
                    <div className="flex items-center">
                      <LineChartIcon className="h-4 w-4 mr-2" />
                      <span>Line</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="candle">
                    <div className="flex items-center">
                      <CandlestickChart className="h-4 w-4 mr-2" />
                      <span>Candlestick</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="area">
                    <div className="flex items-center">
                      <AreaChart className="h-4 w-4 mr-2" />
                      <span>Area</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-r-none" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          {renderCandleStickChart()}
          {renderVolumeChart()}
        </div>
        
        <div className="flex overflow-x-auto p-2 gap-2">
          {availableIndicators.map((indicator) => (
            <Badge
              key={indicator.value}
              variant={selectedIndicators.includes(indicator.value) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                if (selectedIndicators.includes(indicator.value)) {
                  setSelectedIndicators(selectedIndicators.filter(i => i !== indicator.value));
                } else {
                  setSelectedIndicators([...selectedIndicators, indicator.value]);
                }
              }}
            >
              {indicator.name}
            </Badge>
          ))}
          
          {events && events.length > 0 && (
            <Badge variant="outline" className="cursor-pointer ml-auto">
              <History className="h-3.5 w-3.5 mr-1" />
              Show Events
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
