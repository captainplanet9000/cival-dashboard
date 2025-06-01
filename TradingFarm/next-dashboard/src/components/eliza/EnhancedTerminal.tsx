'use client';

import * as React from 'react';
const { useState, useEffect, useRef } = React;
import { TerminalVisualizer } from '@/components/terminal/TerminalVisualizer';
import { ElizaTerminal } from '@/components/eliza/ElizaTerminal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Terminal, ChartBar, LayoutDashboard, Clock, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type DataPoint = {
  timestamp: number;
  price: number;
  volume: number;
  side: 'buy' | 'sell';
};

type TerminalTheme = 'default' | 'matrix' | 'amber' | 'green' | 'blue';

const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD'];

/**
 * EnhancedTerminal Component
 * 
 * Combines ElizaOS Terminal functionality with advanced visualizations for
 * market data, providing a comprehensive trading terminal experience.
 */
export function EnhancedTerminal() {
  const [activeTab, setActiveTab] = useState<string>('terminal');
  const [activeSymbol, setActiveSymbol] = useState<string>('BTC/USD');
  const [terminalTheme, setTerminalTheme] = useState<TerminalTheme>('default');
  const [marketData, setMarketData] = useState<Record<string, DataPoint[]>>({});
  const [lastCommand, setLastCommand] = useState<string>('');
  const [showCommandPanel, setShowCommandPanel] = useState<boolean>(false);
  
  // Generate mock market data
  useEffect(() => {
    const generateInitialData = () => {
      const data: Record<string, DataPoint[]> = {};
      
      symbols.forEach(symbol => {
        data[symbol] = generateMockData(symbol, 100);
      });
      
      return data;
    };
    
    setMarketData(generateInitialData());
    
    // Set up real-time updates
    const interval = setInterval(() => {
      setMarketData((prev: Record<string, DataPoint[]>) => {
        const updated = { ...prev };
        
        // Update each symbol's data
        Object.keys(updated).forEach(symbol => {
          const currentData = [...updated[symbol]];
          
          // Remove oldest point if too many
          if (currentData.length > 100) {
            currentData.shift();
          }
          
          // Get last price
          const lastPrice = currentData[currentData.length - 1]?.price || 
            (symbol.includes('BTC') ? 62000 : symbol.includes('ETH') ? 3500 : 100);
          
          // Generate new price with some randomness
          const trend = Math.random() > 0.5 ? 1 : -1;
          const volatility = symbol.includes('BTC') ? 100 : symbol.includes('ETH') ? 25 : 2;
          const change = (Math.random() - 0.48) * volatility * trend;
          const newPrice = Math.max(lastPrice + change, 1);
          
          // Random volume
          const volume = Math.random() * 10;
          
          // Add new point
          currentData.push({
            timestamp: Date.now(),
            price: newPrice,
            volume,
            side: change >= 0 ? 'buy' : 'sell'
          });
          
          updated[symbol] = currentData;
        });
        
        return updated;
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Handle command that should trigger visualization
  /**
   * Processes terminal commands and activates visualizations when relevant
   * @param command The command entered by the user
   */
  const handleCommandProcessed = (command: string): void => {
    setLastCommand(command);
    
    // Parse command for visualization targets
    const lowerCommand = command.toLowerCase();
    
    // Check for visualization commands
    if (lowerCommand.includes('visualize') || lowerCommand.includes('chart') || lowerCommand.includes('graph')) {
      // Attempt to find symbol in command
      const symbolMatch = symbols.find(sym => lowerCommand.includes(sym.toLowerCase()));
      
      if (symbolMatch) {
        setActiveSymbol(symbolMatch);
        setActiveTab('visualization');
        return;
      }
      
      // General visualization command without specific symbol
      if (lowerCommand.includes('market') || lowerCommand.includes('price')) {
        setActiveTab('visualization');
      }
    }
    
    // Check for specific symbols
    symbols.forEach(symbol => {
      const ticker = symbol.split('/')[0].toLowerCase();
      if (lowerCommand.includes(ticker) && 
          (lowerCommand.includes('price') || 
           lowerCommand.includes('chart') || 
           lowerCommand.includes('data'))) {
        setActiveSymbol(symbol);
        setActiveTab('visualization');
      }
    });
    
    // Check for dashboard commands
    if (lowerCommand.includes('dashboard') || lowerCommand.includes('overview')) {
      setActiveTab('dashboard');
    }
  };
  
  // Handle visualization point click
  /**
   * Handles clicks on data points in the visualization
   * @param point The clicked data point
   */
  const handleDataPointClick = (point: DataPoint): void => {
    // Format date nicely
    const date = new Date(point.timestamp);
    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    
    // Show command panel with point info
    setShowCommandPanel(true);
    setLastCommand(`Market data at ${formattedDate}: ${activeSymbol} price was $${point.price.toFixed(2)} with volume ${point.volume.toFixed(2)}`);
  };
  
  return (
    <div className="flex flex-col w-full h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-2">
          <TabsList className="h-12">
            <TabsTrigger value="terminal" className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              <span className="hidden sm:inline">Terminal</span>
            </TabsTrigger>
            <TabsTrigger value="visualization" className="flex items-center gap-2">
              <ChartBar className="h-4 w-4" />
              <span className="hidden sm:inline">Visualization</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
          </TabsList>
          
          {activeTab === 'visualization' && (
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="cursor-pointer" onClick={() => setTerminalTheme((theme: TerminalTheme) => theme === 'default' ? 'matrix' : 'default')}>
                      {terminalTheme === 'default' ? 'Default Theme' : 'Matrix Theme'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to toggle visualization theme</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <select 
                value={activeSymbol}
                onChange={(e) => setActiveSymbol(e.target.value)}
                className="text-xs border rounded p-1 bg-background"
              >
                {symbols.map(sym => (
                  <option key={sym} value={sym}>{sym}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-hidden">
          <TabsContent value="terminal" className="h-full mt-0 border-none p-0">
            <ElizaTerminalWrapper onCommandProcessed={handleCommandProcessed} />
          </TabsContent>
          
          <TabsContent value="visualization" className="h-full mt-0 border-none p-0">
            <div className="p-2 h-full">
              <TerminalVisualizer 
                title={`${activeSymbol} Market Data`}
                symbol={activeSymbol}
                data={marketData[activeSymbol] || []}
                theme={terminalTheme}
                refreshRate={1000}
                onPointClick={handleDataPointClick}
              />
              
              {showCommandPanel && (
                <Card className="mt-4">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono">{lastCommand}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCommandPanel(false)}
                    >
                      Dismiss
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="dashboard" className="h-full mt-0 border-none p-0">
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-auto h-full">
              {symbols.map(symbol => (
                <Card key={symbol} className="overflow-hidden" onClick={() => {
                  setActiveSymbol(symbol);
                  setActiveTab('visualization');
                }}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">{symbol}</h3>
                      <Badge variant={getMarketTrendBadge(marketData[symbol])}>
                        {getMarketTrend(marketData[symbol])}
                      </Badge>
                    </div>
                    
                    <div className="h-[150px] w-full">
                      <TerminalVisualizer 
                        symbol={symbol}
                        data={marketData[symbol] || []}
                        height={150}
                        refreshRate={3000}
                        showVolume={false}
                        theme={terminalTheme}
                      />
                    </div>
                    
                    {marketData[symbol] && marketData[symbol].length > 0 && (
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">Current</span>
                        <span className="font-medium">
                          ${marketData[symbol][marketData[symbol].length - 1].price.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

/**
 * ElizaTerminalWrapper Component
 * 
 * Wraps the original ElizaTerminal component to capture and process commands
 */
function ElizaTerminalWrapper({ onCommandProcessed }: { onCommandProcessed: (command: string) => void }) {
  // Using a MutationObserver to detect when new messages are added to the chat
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!wrapperRef.current) return;
    
    // Set up a MutationObserver to watch for changes in the DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Find user messages to capture commands
          const userMessages = wrapperRef.current?.querySelectorAll('.bg-primary');
          if (userMessages && userMessages.length > 0) {
            // Get the last message (most recent command)
            const lastMessage = userMessages[userMessages.length - 1];
            if (lastMessage && lastMessage.textContent) {
              onCommandProcessed(lastMessage.textContent);
            }
          }
        }
      });
    });
    
    observer.observe(wrapperRef.current, { childList: true, subtree: true });
    
    return () => observer.disconnect();
  }, [onCommandProcessed]);
  
  return (
    <div ref={wrapperRef} className="h-full">
      <ElizaTerminal />
    </div>
  );
}

// Helper function to generate mock data
function generateMockData(symbol: string, points: number): DataPoint[] {
  const now = Date.now();
  const data: DataPoint[] = [];
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
}

// Helper function to determine market trend
function getMarketTrend(data: DataPoint[] | undefined): string {
  if (!data || data.length < 2) return 'Neutral';
  
  const firstPrice = data[0].price;
  const lastPrice = data[data.length - 1].price;
  const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;
  
  if (percentChange > 5) return 'Strong Bull';
  if (percentChange > 1) return 'Bullish';
  if (percentChange < -5) return 'Strong Bear';
  if (percentChange < -1) return 'Bearish';
  return 'Neutral';
}

// Helper function to get badge variant based on market trend
function getMarketTrendBadge(data: DataPoint[] | undefined): "default" | "secondary" | "destructive" | "outline" {
  if (!data || data.length < 2) return 'secondary';
  
  const firstPrice = data[0].price;
  const lastPrice = data[data.length - 1].price;
  const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;
  
  if (percentChange > 1) return 'default'; // Green for bullish
  if (percentChange < -1) return 'destructive'; // Red for bearish
  return 'secondary'; // Gray for neutral
}
