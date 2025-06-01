/**
 * Real-Time Price Chart Component
 * 
 * This component displays real-time market data in a chart format,
 * with options for different timeframes and visualization settings.
 * Part of the Phase 1 live trading implementation.
 */

"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CandlestickIcon, LineChart, RefreshCcw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { useTheme } from 'next-themes';

interface MarketDataPoint {
  timestamp: number;
  price: number;
  bid?: number;
  ask?: number;
  volume?: number;
  [key: string]: any;
}

interface HistoricalDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface RealTimePriceChartProps {
  exchangeId: string;
  symbol: string;
  title?: string;
  description?: string;
  initialInterval?: string;
  showControls?: boolean;
  height?: number;
  className?: string;
}

// Available time intervals
const INTERVALS = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' }
];

export const RealTimePriceChart = ({
  exchangeId,
  symbol,
  title,
  description,
  initialInterval = '1h',
  showControls = true,
  height = 400,
  className
}: RealTimePriceChartProps) => {
  const [interval, setInterval] = useState(initialInterval);
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  const [realTimeData, setRealTimeData] = useState<MarketDataPoint[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  
  // Format the title if not provided
  const displayTitle = title || `${symbol} Price`;
  
  // Format the description if not provided
  const displayDescription = description || `Real-time price data from ${exchangeId}`;
  
  // Calculate chart colors based on price change
  const chartColor = priceChange >= 0 ? 
    (theme === 'dark' ? '#4ade80' : '#16a34a') : 
    (theme === 'dark' ? '#f87171' : '#dc2626');
  
  // Format current price for display
  const formattedPrice = useMemo(() => {
    if (currentPrice === null) return 'Loading...';
    return formatCurrency(currentPrice);
  }, [currentPrice]);
  
  // Format price change for display
  const formattedPriceChange = useMemo(() => {
    const prefix = priceChange >= 0 ? '+' : '';
    return `${prefix}${formatCurrency(priceChange)} (${prefix}${priceChangePercent.toFixed(2)}%)`;
  }, [priceChange, priceChangePercent]);
  
  // Fetch real-time market data
  const fetchRealTimeData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/exchange/market-data?exchange=${exchangeId}&symbol=${symbol}&forceRefresh=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }
      
      const result = await response.json();
      
      if (result.status !== 'ok') {
        throw new Error(result.error || 'Unknown error');
      }
      
      const newDataPoint: MarketDataPoint = {
        timestamp: result.data.timestamp,
        price: result.data.price,
        bid: result.data.bid,
        ask: result.data.ask,
        volume: result.data.volume24h
      };
      
      // Update real-time data (keep last 60 points)
      setRealTimeData(prevData => {
        const newData = [...prevData, newDataPoint];
        return newData.slice(-60);
      });
      
      // Update current price and calculate change
      if (currentPrice === null) {
        setCurrentPrice(result.data.price);
      } else {
        // Calculate price change from previous day's close or first data point
        const previousPrice = realTimeData.length > 0 ? 
          realTimeData[0].price : result.data.price;
        
        setCurrentPrice(result.data.price);
        setPriceChange(result.data.price - previousPrice);
        setPriceChangePercent((result.data.price - previousPrice) / previousPrice * 100);
      }
    } catch (err) {
      console.error('Error fetching real-time market data:', err);
      setError('Failed to fetch market data');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };
  
  // Fetch historical data based on selected interval
  const fetchHistoricalData = async () => {
    try {
      setLoading(true);
      
      // Calculate time range based on interval
      const now = Date.now();
      let startTime: number;
      
      switch (interval) {
        case '1m':
          startTime = now - 60 * 60 * 1000; // 1 hour back
          break;
        case '5m':
          startTime = now - 5 * 60 * 60 * 1000; // 5 hours back
          break;
        case '15m':
          startTime = now - 15 * 60 * 60 * 1000; // 15 hours back
          break;
        case '1h':
          startTime = now - 2 * 24 * 60 * 60 * 1000; // 2 days back
          break;
        case '4h':
          startTime = now - 8 * 24 * 60 * 60 * 1000; // 8 days back
          break;
        case '1d':
          startTime = now - 30 * 24 * 60 * 60 * 1000; // 30 days back
          break;
        case '1w':
          startTime = now - 180 * 24 * 60 * 60 * 1000; // 180 days back
          break;
        default:
          startTime = now - 24 * 60 * 60 * 1000; // Default to 1 day back
      }
      
      const response = await fetch('/api/exchange/market-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exchange: exchangeId,
          symbol,
          interval,
          startTime,
          endTime: now,
          limit: 200
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }
      
      const result = await response.json();
      
      if (result.status !== 'ok') {
        throw new Error(result.error || 'Unknown error');
      }
      
      setHistoricalData(result.data);
      
      // If there's historical data, use it to set the current price and calculate change
      if (result.data.length > 0) {
        const latestCandle = result.data[result.data.length - 1];
        const firstCandle = result.data[0];
        
        setCurrentPrice(latestCandle.close);
        setPriceChange(latestCandle.close - firstCandle.open);
        setPriceChangePercent((latestCandle.close - firstCandle.open) / firstCandle.open * 100);
      }
    } catch (err) {
      console.error('Error fetching historical market data:', err);
      setError('Failed to fetch historical data');
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data load
  useEffect(() => {
    fetchRealTimeData();
    fetchHistoricalData();
    
    // Set up real-time data polling
    const interval = setInterval(() => {
      fetchRealTimeData();
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, [exchangeId, symbol]);
  
  // Fetch historical data when interval changes
  useEffect(() => {
    fetchHistoricalData();
  }, [interval]);
  
  // Prepare data for line chart
  const lineChartData = chartType === 'line' ? 
    (interval === '1m' ? realTimeData : historicalData.map(d => ({
      timestamp: d.timestamp,
      price: d.close
    }))) : [];
  
  // Format timestamp for display in tooltip
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    
    if (interval === '1d' || interval === '1w') {
      return date.toLocaleDateString();
    }
    
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };
  
  // Refresh data manually
  const handleRefresh = () => {
    fetchRealTimeData();
    fetchHistoricalData();
  };
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{displayTitle}</CardTitle>
            <CardDescription>{displayDescription}</CardDescription>
          </div>
          
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-right">
              <div className="text-2xl font-bold">{formattedPrice}</div>
              <div className={cn(
                "text-xs",
                priceChange >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {formattedPriceChange}
              </div>
            </div>
          )}
        </div>
        
        {showControls && (
          <div className="flex items-center justify-between pt-2">
            <Tabs 
              defaultValue="line" 
              value={chartType} 
              onValueChange={(value) => setChartType(value as 'line' | 'candle')}
              className="w-auto"
            >
              <TabsList className="grid w-32 grid-cols-2">
                <TabsTrigger value="line">
                  <LineChart className="h-4 w-4 mr-1" />
                  Line
                </TabsTrigger>
                <TabsTrigger value="candle">
                  <CandlestickIcon className="h-4 w-4 mr-1" />
                  Candle
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center space-x-2">
              <Select
                value={interval}
                onValueChange={setInterval}
              >
                <SelectTrigger className="w-24">
                  <Clock className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVALS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCcw className={cn(
                  "h-4 w-4",
                  refreshing && "animate-spin"
                )} />
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0 pt-4">
        {loading ? (
          <div className="flex justify-center items-center" style={{ height }}>
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading market data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center" style={{ height }}>
            <div className="text-center">
              <Badge variant="destructive" className="mb-2">Error</Badge>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={handleRefresh}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        ) : chartType === 'line' ? (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart
              data={lineChartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#33333320" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(tick) => {
                  const date = new Date(tick);
                  if (interval === '1d' || interval === '1w') {
                    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  }
                  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                }}
                minTickGap={30}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tickFormatter={(tick) => formatNumber(tick)}
                width={60}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Price']}
                labelFormatter={(label: number) => formatTimestamp(label)}
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                }}
              />
              <ReferenceLine 
                y={currentPrice || 0} 
                stroke="#888" 
                strokeDasharray="3 3" 
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke={chartColor} 
                fillOpacity={1}
                fill="url(#colorPrice)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground">
              Candlestick chart view coming soon
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimePriceChart;
