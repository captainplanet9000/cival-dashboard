'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, BarChart3, Clock, Terminal } from 'lucide-react';

type DataPoint = {
  timestamp: number;
  price: number;
  volume: number;
  side: 'buy' | 'sell';
};

type TerminalVisualizerProps = {
  title?: string;
  symbol?: string;
  data?: DataPoint[];
  height?: number;
  width?: number;
  maxPoints?: number;
  refreshRate?: number;
  showVolume?: boolean;
  showCandlesticks?: boolean;
  showOrderBook?: boolean;
  theme?: 'default' | 'matrix' | 'amber' | 'green' | 'blue';
  isLoading?: boolean;
  onPointClick?: (point: DataPoint) => void;
};

/**
 * TerminalVisualizer - Modern terminal-style visualization component for market data
 * 
 * Renders financial data in a high-performance terminal aesthetic with various
 * visualization modes including ASCII charts, simulated candlesticks, and order book.
 */
export function TerminalVisualizer({
  title = 'Market Data',
  symbol = 'BTC/USD',
  data = [],
  height = 400,
  width = 800,
  maxPoints = 100,
  refreshRate = 1000,
  showVolume = true,
  showCandlesticks = true,
  showOrderBook = true,
  theme = 'default',
  isLoading = false,
  onPointClick
}: TerminalVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState('line');
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const { theme: systemTheme } = useTheme();
  
  // Configure terminal colors based on theme
  const getThemeColors = () => {
    const isDark = systemTheme === 'dark';
    
    const themes = {
      default: {
        background: isDark ? '#1E1E2E' : '#F9FAFB',
        text: isDark ? '#CDD6F4' : '#374151',
        accent: isDark ? '#94E2D5' : '#2563EB',
        grid: isDark ? '#313244' : '#E5E7EB',
        positive: isDark ? '#A6E3A1' : '#10B981',
        negative: isDark ? '#F38BA8' : '#EF4444',
        muted: isDark ? '#6C7086' : '#9CA3AF'
      },
      matrix: {
        background: '#000000',
        text: '#00FF00',
        accent: '#00CC00',
        grid: '#003300',
        positive: '#00FF00',
        negative: '#CCFF00',
        muted: '#006600'
      },
      amber: {
        background: '#280D00',
        text: '#FFBF00',
        accent: '#FF9D00',
        grid: '#4F2800',
        positive: '#FFBF00',
        negative: '#FF9D00',
        muted: '#7F5F00'
      },
      green: {
        background: '#001100',
        text: '#00FF00',
        accent: '#00AA00',
        grid: '#003300',
        positive: '#00FF00',
        negative: '#AAFF00',
        muted: '#005500'
      },
      blue: {
        background: '#000033',
        text: '#0088FF',
        accent: '#0055CC',
        grid: '#000066',
        positive: '#00CCFF',
        negative: '#0088FF',
        muted: '#0044AA'
      }
    };
    
    return themes[theme] || themes.default;
  };
  
  // Generate ASCII chart from data
  const generateAsciiChart = (data: DataPoint[], width: number, height: number) => {
    if (data.length === 0) return [];
    
    const prices = data.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    
    // Characters to use for the chart
    const chars = '▁▂▃▄▅▆▇█';
    
    // Calculate how many data points we can show based on width
    const points = Math.min(data.length, width);
    const step = Math.max(1, Math.floor(data.length / points));
    
    // Create lines for the chart (limited by height)
    const lines: string[] = [];
    
    // Header with symbol and current price
    const currentPrice = data[data.length - 1]?.price || 0;
    const priceChange = data.length > 1 
      ? ((currentPrice - data[0].price) / data[0].price * 100).toFixed(2)
      : '0.00';
    
    const priceChangeSymbol = Number(priceChange) >= 0 ? '↑' : '↓';
    const header = `${symbol} ${currentPrice.toFixed(2)} ${priceChangeSymbol}${Math.abs(Number(priceChange))}%`;
    lines.push(header);
    
    // Y-axis labels (prices)
    lines.push(`${max.toFixed(2)} ┌${'─'.repeat(points)}┐`);
    
    // Chart body
    const chartHeight = Math.min(15, height - 5);
    for (let i = 0; i < chartHeight; i++) {
      const price = max - (range * (i / chartHeight));
      let line = `${price.toFixed(2)} │`;
      
      for (let j = 0; j < points; j++) {
        const dataIdx = data.length - points + j;
        if (dataIdx >= 0) {
          const dataPoint = data[dataIdx];
          const normalizedHeight = (dataPoint.price - min) / range;
          const charPosition = Math.floor(normalizedHeight * chartHeight);
          
          if (charPosition === chartHeight - i - 1) {
            line += dataPoint.side === 'buy' ? '▲' : '▼';
          } else if (charPosition > chartHeight - i - 1) {
            line += '│';
          } else {
            line += ' ';
          }
        } else {
          line += ' ';
        }
      }
      
      line += '│';
      lines.push(line);
    }
    
    // Bottom of chart
    lines.push(`${min.toFixed(2)} └${'─'.repeat(points)}┘`);
    
    // Time axis
    if (data.length > 0) {
      const firstTime = new Date(data[0].timestamp).toLocaleTimeString();
      const lastTime = new Date(data[data.length - 1].timestamp).toLocaleTimeString();
      const timeAxis = `      ${firstTime}${' '.repeat(points - firstTime.length - lastTime.length)}${lastTime}`;
      lines.push(timeAxis);
    }
    
    return lines;
  };
  
  // Generate ASCII candlestick view
  const generateCandlesticks = (data: DataPoint[]) => {
    if (data.length === 0) return [];
    
    const lines: string[] = [];
    lines.push(`${symbol} Candlestick View`);
    lines.push('');
    
    // Group data into candles (assume 1 min candles for simplicity)
    const candles: { time: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
    
    // Simple grouping by minute
    let currentMinute = -1;
    let currentCandle: any = null;
    
    for (const point of data) {
      const date = new Date(point.timestamp);
      const minute = date.getMinutes();
      
      if (minute !== currentMinute) {
        if (currentCandle) {
          candles.push(currentCandle);
        }
        currentMinute = minute;
        currentCandle = {
          time: date.toLocaleTimeString(),
          open: point.price,
          high: point.price,
          low: point.price,
          close: point.price,
          volume: point.volume
        };
      } else {
        currentCandle.high = Math.max(currentCandle.high, point.price);
        currentCandle.low = Math.min(currentCandle.low, point.price);
        currentCandle.close = point.price;
        currentCandle.volume += point.volume;
      }
    }
    
    if (currentCandle) {
      candles.push(currentCandle);
    }
    
    // Display candlestick header
    lines.push('Time     | Open   | High   | Low    | Close  | Volume  | Candle');
    lines.push('─'.repeat(80));
    
    // Show last 10 candles
    const recentCandles = candles.slice(-10);
    
    for (const candle of recentCandles) {
      const bullish = candle.close >= candle.open;
      const candleChar = bullish ? '█' : '▒';
      const wickChar = '│';
      
      // Visualize the candle
      let candleVis = '';
      // Scale to fit in terminal
      const scale = 10;
      const bodySize = Math.round(Math.abs(candle.close - candle.open) * scale);
      const topWick = Math.round((candle.high - Math.max(candle.open, candle.close)) * scale);
      const bottomWick = Math.round((Math.min(candle.open, candle.close) - candle.low) * scale);
      
      // Draw top wick
      candleVis += wickChar.repeat(Math.max(0, topWick));
      
      // Draw candle body
      candleVis += candleChar.repeat(Math.max(1, bodySize));
      
      // Draw bottom wick
      candleVis += wickChar.repeat(Math.max(0, bottomWick));
      
      lines.push(
        `${candle.time} | ${candle.open.toFixed(2)} | ${candle.high.toFixed(2)} | ${candle.low.toFixed(2)} | ${candle.close.toFixed(2)} | ${candle.volume.toFixed(2)} | ${candleVis}`
      );
    }
    
    return lines;
  };
  
  // Generate order book visualization
  const generateOrderBook = (data: DataPoint[]) => {
    if (data.length === 0) return [];
    
    const lines: string[] = [];
    lines.push(`${symbol} Order Book Simulation`);
    lines.push('');
    
    // Simulate order book from recent trades
    const currentPrice = data[data.length - 1]?.price || 0;
    const buyOrders: {price: number, volume: number}[] = [];
    const sellOrders: {price: number, volume: number}[] = [];
    
    // Generate simulated order book
    for (let i = 1; i <= 10; i++) {
      const buyPrice = currentPrice * (1 - (i * 0.001));
      const sellPrice = currentPrice * (1 + (i * 0.001));
      
      // Simulate volumes based on a normal distribution around current price
      const buyVolume = Math.max(0.1, 10 * Math.exp(-(i * i) / 20));
      const sellVolume = Math.max(0.1, 10 * Math.exp(-(i * i) / 20));
      
      buyOrders.push({price: buyPrice, volume: buyVolume});
      sellOrders.push({price: sellPrice, volume: sellVolume});
    }
    
    // Order book header
    lines.push('       Bid (Buy)      |  Price  |      Ask (Sell)      ');
    lines.push('─'.repeat(60));
    
    // Display the book
    for (let i = 0; i < 10; i++) {
      const sellOrder = sellOrders[i];
      const buyOrder = buyOrders[i];
      
      const buyVolVisual = '█'.repeat(Math.round(buyOrder.volume));
      const sellVolVisual = '█'.repeat(Math.round(sellOrder.volume));
      
      if (i === 4) {
        // Middle line - current market price
        lines.push(`${buyVolVisual.padEnd(20)} | ${currentPrice.toFixed(2)} | ${sellVolVisual.padEnd(20)}`);
        lines.push('─'.repeat(60) + ' MARKET PRICE ' + '─'.repeat(10));
      } else {
        lines.push(`${buyVolVisual.padEnd(20)} | ${buyOrder.price.toFixed(2)} | `);
        lines.push(`${' '.repeat(20)} | ${sellOrder.price.toFixed(2)} | ${sellVolVisual}`);
      }
    }
    
    return lines;
  };
  
  // Update canvas drawing  
  const updateCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const colors = getThemeColors();
    
    // Clear the canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (data.length === 0 || isLoading) return;
    
    // Prepare data for plotting
    const prices = data.map(d => d.price);
    const volumes = data.map(d => d.volume);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    
    const maxVolume = Math.max(...volumes);
    
    // Draw grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines (price levels)
    for (let i = 0; i <= 5; i++) {
      const y = canvas.height * 0.8 * (1 - i / 5) + canvas.height * 0.1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
      
      // Label price levels
      const price = min + (range * (i / 5));
      ctx.fillStyle = colors.text;
      ctx.font = '10px monospace';
      ctx.fillText(price.toFixed(2), 5, y - 5);
    }
    
    // Vertical grid lines (time)
    for (let i = 0; i <= 5; i++) {
      const x = canvas.width * 0.1 + canvas.width * 0.8 * (i / 5);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
      
      // Label time
      if (data.length > 0) {
        const index = Math.floor(data.length * (i / 5));
        const validIndex = Math.min(data.length - 1, Math.max(0, index));
        const time = new Date(data[validIndex].timestamp).toLocaleTimeString();
        ctx.fillStyle = colors.text;
        ctx.font = '10px monospace';
        ctx.fillText(time, x - 20, canvas.height - 5);
      }
    }
    
    // Draw price line
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const dataPoints = Math.min(data.length, maxPoints);
    const step = Math.max(1, Math.floor(data.length / dataPoints));
    
    for (let i = 0; i < dataPoints; i++) {
      const dataIndex = data.length - dataPoints + i;
      if (dataIndex >= 0) {
        const point = data[dataIndex];
        const x = canvas.width * 0.1 + (canvas.width * 0.8 * (i / dataPoints));
        const y = canvas.height * 0.8 * (1 - (point.price - min) / range) + canvas.height * 0.1;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Draw point markers
        ctx.fillStyle = point.side === 'buy' ? colors.positive : colors.negative;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.stroke();
    
    // Draw volume bars if enabled
    if (showVolume) {
      for (let i = 0; i < dataPoints; i++) {
        const dataIndex = data.length - dataPoints + i;
        if (dataIndex >= 0) {
          const point = data[dataIndex];
          const x = canvas.width * 0.1 + (canvas.width * 0.8 * (i / dataPoints));
          const barWidth = (canvas.width * 0.8 / dataPoints) * 0.8;
          const barHeight = (point.volume / maxVolume) * (canvas.height * 0.2);
          
          ctx.fillStyle = point.side === 'buy' 
            ? colors.positive + '80' // 50% opacity
            : colors.negative + '80';
            
          ctx.fillRect(
            x - barWidth / 2, 
            canvas.height - 20 - barHeight, 
            barWidth, 
            barHeight
          );
        }
      }
    }
  };
  
  // Handle canvas click for data point interaction
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onPointClick) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const normalizedX = (x - canvas.width * 0.1) / (canvas.width * 0.8);
    
    if (normalizedX < 0 || normalizedX > 1) return;
    
    const dataPoints = Math.min(data.length, maxPoints);
    const pointIndex = Math.floor(normalizedX * dataPoints);
    const dataIndex = data.length - dataPoints + pointIndex;
    
    if (dataIndex >= 0 && dataIndex < data.length) {
      onPointClick(data[dataIndex]);
    }
  };
  
  // Handle tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    let lines: string[] = [];
    
    switch (value) {
      case 'line':
        lines = generateAsciiChart(data, 80, 20);
        break;
      case 'candle':
        lines = generateCandlesticks(data);
        break;
      case 'book':
        lines = generateOrderBook(data);
        break;
      default:
        lines = generateAsciiChart(data, 80, 20);
    }
    
    setTerminalLines(lines);
  };
  
  // Update visualization when data changes
  useEffect(() => {
    updateCanvas();
    handleTabChange(activeTab);
    
    // Set up animation frame for gradual updates if needed
    const timer = setInterval(() => {
      updateCanvas();
    }, refreshRate);
    
    return () => clearInterval(timer);
  }, [data, activeTab, refreshRate, theme, systemTheme]);
  
  return (
    <Card className="border rounded-md overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl flex items-center">
            <Terminal className="w-5 h-5 mr-2" />
            {title}
          </CardTitle>
          
          <Tabs value={activeTab} onValueChange={handleTabChange} className="hidden sm:block">
            <TabsList>
              <TabsTrigger value="line">ASCII Chart</TabsTrigger>
              {showCandlesticks && <TabsTrigger value="candle">Candlesticks</TabsTrigger>}
              {showOrderBook && <TabsTrigger value="book">Order Book</TabsTrigger>}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-[300px] w-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        ) : (
          <div className={`relative h-[${height}px] w-full`}>
            <canvas 
              ref={canvasRef} 
              width={width} 
              height={height}
              className="hidden md:block w-full h-full"
              onClick={handleCanvasClick}
            />
            
            <ScrollArea className="md:hidden h-[400px] font-mono text-sm rounded-md">
              <div className="p-4 whitespace-pre">
                {terminalLines.map((line, i) => (
                  <div key={i} className="leading-tight">{line}</div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        
        <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>Updated: {new Date().toLocaleTimeString()}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-1 text-green-500" />
              <span>Buy Volume: {data.filter(d => d.side === 'buy').reduce((sum, d) => sum + d.volume, 0).toFixed(2)}</span>
            </div>
            
            <div className="flex items-center">
              <ArrowUpDown className="w-4 h-4 mr-1 text-red-500" />
              <span>Sell Volume: {data.filter(d => d.side === 'sell').reduce((sum, d) => sum + d.volume, 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
