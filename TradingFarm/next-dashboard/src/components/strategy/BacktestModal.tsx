'use client';

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  ArrowDownUp, 
  Calendar, 
  Clock, 
  LineChart, 
  Play, 
  Settings, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { logEvent } from '@/utils/logging';

interface BacktestModalProps {
  strategyId: string;
  params?: Record<string, any>;
  isOpen: boolean;
  onClose: () => void;
}

interface BacktestResult {
  totalPnl: number;
  totalPnlPercent: number;
  trades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
  duration: string;
  startDate: string;
  endDate: string;
  positions: BacktestPosition[];
}

interface BacktestPosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  entryTime: string;
  exitTime: string;
  duration: string;
}

export function BacktestModal({ strategyId, params = {}, isOpen, onClose }: BacktestModalProps) {
  const [activeTab, setActiveTab] = React.useState('configuration');
  const [loading, setLoading] = React.useState(false);
  const [runningBacktest, setRunningBacktest] = React.useState(false);
  const [backtestResult, setBacktestResult] = React.useState<BacktestResult | null>(null);
  
  const [backtestConfig, setBacktestConfig] = React.useState({
    symbol: params.symbol || 'BTC/USDT',
    timeframe: params.timeframe || '1h',
    startDate: params.startDate || getDateNMonthsAgo(3),
    endDate: params.endDate || new Date().toISOString().split('T')[0],
    initialCapital: params.initialCapital || 10000,
    leverage: params.leverage || 3,
    feeRate: params.feeRate || 0.075,
    slippage: params.slippage || 0.05,
    enableStopLoss: params.enableStopLoss !== undefined ? params.enableStopLoss : true,
    stopLossPercent: params.stopLossPercent || 2,
    enableTakeProfit: params.enableTakeProfit !== undefined ? params.enableTakeProfit : true,
    takeProfitPercent: params.takeProfitPercent || 4,
  });

  function getDateNMonthsAgo(n: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() - n);
    return date.toISOString().split('T')[0];
  }

  const handleConfigChange = (key: string, value: any) => {
    setBacktestConfig({
      ...backtestConfig,
      [key]: value
    });
  };

  const runBacktest = async () => {
    setLoading(true);
    setRunningBacktest(true);
    setActiveTab('results');
    
    // Log backtest start event
    logEvent({
      category: 'backtest',
      action: 'run',
      label: strategyId,
      value: 1
    });
    
    try {
      // In a real implementation, this would be an API call to run the backtest
      // For demo purposes, we'll simulate a delay and return mock data
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock backtest results
      const mockResult: BacktestResult = {
        totalPnl: 2745.32,
        totalPnlPercent: 27.45,
        trades: 24,
        winRate: 68.2,
        avgWin: 312.45,
        avgLoss: -156.78,
        maxDrawdown: 12.34,
        sharpeRatio: 1.87,
        duration: '3 months',
        startDate: backtestConfig.startDate,
        endDate: backtestConfig.endDate,
        positions: generateMockPositions(24, backtestConfig.symbol)
      };
      
      setBacktestResult(mockResult);
      
      // Log successful backtest
      logEvent({
        category: 'backtest',
        action: 'completed',
        label: strategyId,
        value: 1
      });
    } catch (error) {
      console.error('Error running backtest:', error);
      
      // Log backtest error
      logEvent({
        category: 'backtest',
        action: 'error',
        label: strategyId,
        value: 1
      });
    } finally {
      setLoading(false);
      setRunningBacktest(false);
    }
  };

  function generateMockPositions(count: number, symbol: string): BacktestPosition[] {
    const positions: BacktestPosition[] = [];
    const now = new Date();
    const startDate = new Date(backtestConfig.startDate);
    
    for (let i = 0; i < count; i++) {
      const entryDate = new Date(startDate.getTime() + ((now.getTime() - startDate.getTime()) * (i / count)));
      const exitDate = new Date(entryDate.getTime() + (Math.random() * 86400000 * 5));
      const duration = Math.floor((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60)) + ' hours';
      
      const side = Math.random() > 0.5 ? 'long' : 'short';
      const entryPrice = 20000 + (Math.random() * 10000);
      const priceChange = (Math.random() * 0.1) * entryPrice;
      const exitPrice = side === 'long' 
        ? entryPrice + (Math.random() > 0.7 ? priceChange : -priceChange) 
        : entryPrice - (Math.random() > 0.7 ? priceChange : -priceChange);
      
      const size = (backtestConfig.initialCapital / count) / entryPrice;
      const pnl = side === 'long' 
        ? (exitPrice - entryPrice) * size 
        : (entryPrice - exitPrice) * size;
      const pnlPercent = (pnl / (size * entryPrice)) * 100;
      
      positions.push({
        id: `p-${i}`,
        symbol,
        side,
        entryPrice,
        exitPrice,
        size,
        pnl,
        pnlPercent,
        entryTime: entryDate.toISOString(),
        exitTime: exitDate.toISOString(),
        duration
      });
    }
    
    return positions;
  }

  const resetBacktest = () => {
    setBacktestResult(null);
    setActiveTab('configuration');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Strategy Backtest
          </DialogTitle>
          <DialogDescription>
            Analyze historical performance of the strategy under different market conditions
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="configuration" className="flex-1">
              <Settings className="h-4 w-4 mr-2" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="results" className="flex-1" disabled={!backtestResult && !runningBacktest}>
              <LineChart className="h-4 w-4 mr-2" />
              Results
            </TabsTrigger>
            <TabsTrigger value="trades" className="flex-1" disabled={!backtestResult}>
              <ArrowDownUp className="h-4 w-4 mr-2" />
              Trades
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="configuration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Market Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Select 
                      value={backtestConfig.symbol} 
                      onValueChange={(value) => handleConfigChange('symbol', value)}
                    >
                      <SelectTrigger id="symbol">
                        <SelectValue placeholder="Select symbol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                        <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                        <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                        <SelectItem value="XRP/USDT">XRP/USDT</SelectItem>
                        <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timeframe">Timeframe</Label>
                    <Select 
                      value={backtestConfig.timeframe} 
                      onValueChange={(value) => handleConfigChange('timeframe', value)}
                    >
                      <SelectTrigger id="timeframe">
                        <SelectValue placeholder="Select timeframe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1m">1 minute</SelectItem>
                        <SelectItem value="5m">5 minutes</SelectItem>
                        <SelectItem value="15m">15 minutes</SelectItem>
                        <SelectItem value="1h">1 hour</SelectItem>
                        <SelectItem value="4h">4 hours</SelectItem>
                        <SelectItem value="1d">1 day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input 
                      id="startDate"
                      type="date" 
                      value={backtestConfig.startDate}
                      onChange={(e) => handleConfigChange('startDate', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input 
                      id="endDate"
                      type="date" 
                      value={backtestConfig.endDate}
                      onChange={(e) => handleConfigChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Trading Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="initialCapital">Initial Capital (USDT)</Label>
                    <Input 
                      id="initialCapital"
                      type="number" 
                      value={backtestConfig.initialCapital}
                      onChange={(e) => handleConfigChange('initialCapital', parseFloat(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="leverage">Leverage (1-20x)</Label>
                    <div className="flex items-center space-x-2">
                      <Slider 
                        id="leverage"
                        value={[backtestConfig.leverage]} 
                        min={1} 
                        max={20} 
                        step={1}
                        onValueChange={(values) => handleConfigChange('leverage', values[0])}
                      />
                      <span className="w-12 text-center">{backtestConfig.leverage}x</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="feeRate">Fee Rate (%)</Label>
                    <Input 
                      id="feeRate"
                      type="number" 
                      step="0.001"
                      value={backtestConfig.feeRate}
                      onChange={(e) => handleConfigChange('feeRate', parseFloat(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="slippage">Slippage (%)</Label>
                    <Input 
                      id="slippage"
                      type="number" 
                      step="0.01"
                      value={backtestConfig.slippage}
                      onChange={(e) => handleConfigChange('slippage', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enableStopLoss">Stop Loss</Label>
                      <div className="text-sm text-muted-foreground">Automatically close losing positions</div>
                    </div>
                    <Switch 
                      id="enableStopLoss"
                      checked={backtestConfig.enableStopLoss}
                      onCheckedChange={(checked) => handleConfigChange('enableStopLoss', checked)}
                    />
                  </div>
                  
                  {backtestConfig.enableStopLoss && (
                    <div className="mt-2">
                      <Label htmlFor="stopLossPercent" className="text-sm">Stop Loss Percentage</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Slider 
                          id="stopLossPercent"
                          value={[backtestConfig.stopLossPercent]} 
                          min={0.5} 
                          max={10} 
                          step={0.5}
                          onValueChange={(values) => handleConfigChange('stopLossPercent', values[0])}
                        />
                        <span className="w-12 text-center">{backtestConfig.stopLossPercent}%</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enableTakeProfit">Take Profit</Label>
                      <div className="text-sm text-muted-foreground">Automatically close profitable positions</div>
                    </div>
                    <Switch 
                      id="enableTakeProfit"
                      checked={backtestConfig.enableTakeProfit}
                      onCheckedChange={(checked) => handleConfigChange('enableTakeProfit', checked)}
                    />
                  </div>
                  
                  {backtestConfig.enableTakeProfit && (
                    <div className="mt-2">
                      <Label htmlFor="takeProfitPercent" className="text-sm">Take Profit Percentage</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Slider 
                          id="takeProfitPercent"
                          value={[backtestConfig.takeProfitPercent]} 
                          min={1} 
                          max={20} 
                          step={0.5}
                          onValueChange={(values) => handleConfigChange('takeProfitPercent', values[0])}
                        />
                        <span className="w-12 text-center">{backtestConfig.takeProfitPercent}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end">
              <Button onClick={runBacktest} disabled={loading} className="w-32">
                {loading ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Backtest
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="results" className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="mt-4 text-muted-foreground">Running backtest, please wait...</p>
              </div>
            ) : backtestResult ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Profit/Loss</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${backtestResult.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${backtestResult.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className={`text-sm ${backtestResult.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {backtestResult.totalPnlPercent >= 0 ? '+' : ''}{backtestResult.totalPnlPercent.toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Trades</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{backtestResult.trades}</div>
                      <div className="text-sm text-muted-foreground">
                        Win rate: {backtestResult.winRate.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-500">
                        {backtestResult.maxDrawdown.toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {backtestResult.sharpeRatio.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {backtestResult.sharpeRatio > 1 ? 'Good' : 'Poor'} risk-adjusted return
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Trade Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium mb-1">Avg. Winning Trade</div>
                        <div className="text-lg text-green-500">
                          ${backtestResult.avgWin.toFixed(2)}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-1">Avg. Losing Trade</div>
                        <div className="text-lg text-red-500">
                          ${backtestResult.avgLoss.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium mb-1">Backtest Period</div>
                        <div className="text-lg">
                          {backtestResult.duration}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium mb-1">Date Range</div>
                        <div className="text-lg flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(backtestResult.startDate).toLocaleDateString()} - {new Date(backtestResult.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={resetBacktest}>
                    Reconfigure Backtest
                  </Button>
                  
                  <Button onClick={() => setActiveTab('trades')}>
                    View All Trades
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-12">
                <p className="text-muted-foreground">No backtest results available</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab('configuration')}>
                  Configure Backtest
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="trades">
            {backtestResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Trade List</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {backtestResult.positions.map((position, index) => (
                      <div key={position.id} className="border rounded-md p-3 flex justify-between">
                        <div>
                          <div className="flex items-center">
                            <Badge 
                              variant={position.side === 'long' ? 'default' : 'secondary'}
                              className="mr-2"
                            >
                              {position.side.toUpperCase()}
                            </Badge>
                            <span className="font-medium">{position.symbol}</span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(position.entryTime).toLocaleDateString()} - {new Date(position.exitTime).toLocaleDateString()}
                          </div>
                          <div className="text-sm mt-1">
                            {position.size.toFixed(4)} @ ${position.entryPrice.toFixed(2)} → ${position.exitPrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium flex items-center ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {position.pnl >= 0 ? (
                              <ArrowUpRight className="h-4 w-4 mr-1" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 mr-1" />
                            )}
                            ${Math.abs(position.pnl).toFixed(2)}
                          </div>
                          <div className={`text-sm ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {position.pnl >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {position.duration}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
