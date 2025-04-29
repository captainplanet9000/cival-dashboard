'use client';

import React, { useState, useEffect } from 'react';
import { TerminalVisualizer } from '@/components/terminal/TerminalVisualizer';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Terminal, BarChart2, RefreshCw, PieChart } from 'lucide-react';

// Mock data generator for demonstration
const generateMockData = (symbol: string, points: number) => {
  const now = Date.now();
  const data = [];
  let price = symbol.includes('BTC') ? 62000 : symbol.includes('ETH') ? 3500 : 100;
  let volume = 0;
  
  // Add randomness but maintain a trend
  const trend = Math.random() > 0.5 ? 1 : -1;
  const volatility = symbol.includes('BTC') ? 200 : symbol.includes('ETH') ? 50 : 5;
  
  for (let i = 0; i < points; i++) {
    // More recent data points have timestamps closer to now
    const timestamp = now - (points - i - 1) * 60000; // 1 minute between points
    
    // Add some randomness to price with a slight trend
    const change = (Math.random() - 0.48) * volatility * trend;
    price += change;
    price = Math.max(price, 1); // Ensure price doesn't go below 1
    
    // Random volume with occasional spikes
    volume = Math.random() * 10;
    if (Math.random() > 0.9) volume *= 5; // Occasional volume spike
    
    // Determine if it's a buy or sell based on price movement
    const side = change >= 0 ? 'buy' : 'sell';
    
    data.push({
      timestamp,
      price,
      volume,
      side
    });
  }
  
  return data;
};

export default function TerminalVisualizationPage() {
  const [symbols, setSymbols] = useState(['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD']);
  const [activeSymbol, setActiveSymbol] = useState('BTC/USD');
  const [terminalTheme, setTerminalTheme] = useState('default');
  const [refreshRate, setRefreshRate] = useState(2000);
  const [showVolume, setShowVolume] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mockData, setMockData] = useState(generateMockData('BTC/USD', 100));
  const [isLoading, setIsLoading] = useState(false);
  
  // Simulate real-time updates
  useEffect(() => {
    if (!autoRefresh) return;
    
    const timer = setInterval(() => {
      // Add a new data point to simulate real-time updates
      setMockData(prev => {
        const newData = [...prev];
        
        // Remove oldest point if we have more than 100
        if (newData.length > 100) {
          newData.shift();
        }
        
        // Get last price
        const lastPrice = newData[newData.length - 1]?.price || 
          (activeSymbol.includes('BTC') ? 62000 : activeSymbol.includes('ETH') ? 3500 : 100);
        
        // Generate new price with some randomness
        const trend = Math.random() > 0.5 ? 1 : -1;
        const volatility = activeSymbol.includes('BTC') ? 100 : activeSymbol.includes('ETH') ? 25 : 2;
        const change = (Math.random() - 0.48) * volatility * trend;
        const newPrice = Math.max(lastPrice + change, 1);
        
        // Random volume
        const volume = Math.random() * 10;
        
        // Add new point
        newData.push({
          timestamp: Date.now(),
          price: newPrice,
          volume,
          side: change >= 0 ? 'buy' : 'sell'
        });
        
        return newData;
      });
    }, refreshRate);
    
    return () => clearInterval(timer);
  }, [refreshRate, autoRefresh, activeSymbol]);
  
  // Handle symbol change
  const handleSymbolChange = (value: string) => {
    setIsLoading(true);
    setActiveSymbol(value);
    
    // Simulate loading delay
    setTimeout(() => {
      setMockData(generateMockData(value, 100));
      setIsLoading(false);
    }, 500);
  };
  
  // Handle theme change
  const handleThemeChange = (value: string) => {
    setTerminalTheme(value);
  };
  
  // Handle manual refresh
  const handleRefresh = () => {
    setIsLoading(true);
    
    // Simulate loading delay
    setTimeout(() => {
      setMockData(generateMockData(activeSymbol, 100));
      setIsLoading(false);
    }, 500);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Terminal className="mr-2 h-6 w-6" />
            Terminal Visualization
          </h1>
          <p className="text-muted-foreground">
            Modern terminal-style visualization for trading data
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <Select value={activeSymbol} onValueChange={handleSymbolChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select symbol" />
            </SelectTrigger>
            <SelectContent>
              {symbols.map(symbol => (
                <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={terminalTheme} onValueChange={handleThemeChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="matrix">Matrix</SelectItem>
              <SelectItem value="amber">Amber</SelectItem>
              <SelectItem value="green">Green</SelectItem>
              <SelectItem value="blue">Blue</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleRefresh} variant="outline" size="icon" className="h-10 w-10">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3">
          <TerminalVisualizer 
            title={`${activeSymbol} Real-time Data`}
            symbol={activeSymbol}
            data={mockData}
            theme={terminalTheme as any}
            isLoading={isLoading}
            refreshRate={refreshRate}
            showVolume={showVolume}
            onPointClick={(point) => {
              console.log('Clicked point:', point);
            }}
          />
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visualization Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="refresh-rate">Refresh Rate: {refreshRate}ms</Label>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="auto-refresh">Auto</Label>
                    <Switch 
                      id="auto-refresh" 
                      checked={autoRefresh} 
                      onCheckedChange={setAutoRefresh} 
                    />
                  </div>
                </div>
                <Slider
                  id="refresh-rate"
                  min={500}
                  max={5000}
                  step={500}
                  value={[refreshRate]}
                  onValueChange={(value) => setRefreshRate(value[0])}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="show-volume" 
                  checked={showVolume} 
                  onCheckedChange={setShowVolume} 
                />
                <Label htmlFor="show-volume">Show Volume</Label>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Market Statistics</CardTitle>
              <CardDescription>Real-time metrics for {activeSymbol}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current Price</span>
                <span className="font-medium">
                  ${mockData[mockData.length - 1]?.price.toFixed(2) || '0.00'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">24h Change</span>
                <span className={
                  mockData.length > 1 &&
                  mockData[mockData.length - 1].price > mockData[0].price
                    ? 'text-green-500 font-medium'
                    : 'text-red-500 font-medium'
                }>
                  {mockData.length > 1
                    ? `${((mockData[mockData.length - 1].price - mockData[0].price) / mockData[0].price * 100).toFixed(2)}%`
                    : '0.00%'
                  }
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Volume</span>
                <span className="font-medium">
                  {mockData.reduce((sum, point) => sum + point.volume, 0).toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Buy/Sell Ratio</span>
                <span className="font-medium">
                  {(() => {
                    const buys = mockData.filter(d => d.side === 'buy').length;
                    const sells = mockData.filter(d => d.side === 'sell').length;
                    return `${(buys / (buys + sells) * 100).toFixed(1)}% / ${(sells / (buys + sells) * 100).toFixed(1)}%`;
                  })()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {symbols.map(symbol => (
          symbol !== activeSymbol && (
            <Card key={symbol} className="cursor-pointer hover:border-primary transition-colors" 
                  onClick={() => handleSymbolChange(symbol)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between">
                  <span>{symbol}</span>
                  <BarChart2 className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-24">
                  <TerminalVisualizer 
                    symbol={symbol}
                    data={generateMockData(symbol, 50)}
                    height={100}
                    refreshRate={5000}
                    showVolume={false}
                    theme={terminalTheme as any}
                  />
                </div>
                
                <div className="flex justify-between items-center mt-4 text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">
                    ${symbol.includes('BTC') 
                      ? (62000 + Math.random() * 1000).toFixed(2)
                      : symbol.includes('ETH')
                        ? (3500 + Math.random() * 100).toFixed(2)
                        : (100 + Math.random() * 10).toFixed(2)
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        ))}
      </div>
    </div>
  );
}
