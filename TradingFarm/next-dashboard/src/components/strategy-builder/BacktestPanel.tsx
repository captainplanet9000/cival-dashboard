'use client';

import React, { useState } from 'react';
import { Node, Edge } from 'reactflow';
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from '@/components/date-range-picker';
import { addDays, format } from 'date-fns';
import { Calendar as CalendarIcon, PlayIcon, LineChart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { backtest } from '@/app/actions/strategy-actions';
import { toast } from 'sonner';

// Import or define Chart components (using Recharts)
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface BacktestPanelProps {
  strategyNodes: Node[];
  strategyEdges: Edge[];
  strategyName: string;
}

interface BacktestResults {
  equityCurve: { date: string; equity: number }[];
  performance: {
    initialCapital: number;
    finalCapital: number;
    totalReturn: number;
    maxDrawdown: number;
    winRate: number;
    sharpeRatio: number;
    profitFactor: number;
    totalTrades: number;
  };
  trades: {
    id: number;
    date: string;
    type: 'buy' | 'sell';
    price: number;
    quantity: number;
    pnl?: number;
  }[];
}

const BacktestPanel: React.FC<BacktestPanelProps> = ({ 
  strategyNodes, 
  strategyEdges,
  strategyName
}) => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1d');
  const [initialCapital, setInitialCapital] = useState(10000);
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -90),
    to: new Date(),
  });
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestResults, setBacktestResults] = useState<BacktestResults | null>(null);
  const [activeTab, setActiveTab] = useState('equity');

  // Popular symbols
  const popularSymbols = [
    { value: 'BTCUSDT', label: 'Bitcoin (BTC/USDT)' },
    { value: 'ETHUSDT', label: 'Ethereum (ETH/USDT)' },
    { value: 'BNBUSDT', label: 'Binance Coin (BNB/USDT)' },
    { value: 'SOLUSDT', label: 'Solana (SOL/USDT)' },
    { value: 'ADAUSDT', label: 'Cardano (ADA/USDT)' },
    { value: 'DOGEUSDT', label: 'Dogecoin (DOGE/USDT)' },
    { value: 'XRPUSDT', label: 'Ripple (XRP/USDT)' },
    { value: 'DOTUSDT', label: 'Polkadot (DOT/USDT)' },
  ];

  // Available timeframes
  const timeframes = [
    { value: '1m', label: '1 minute' },
    { value: '5m', label: '5 minutes' },
    { value: '15m', label: '15 minutes' },
    { value: '30m', label: '30 minutes' },
    { value: '1h', label: '1 hour' },
    { value: '4h', label: '4 hours' },
    { value: '1d', label: '1 day' },
    { value: '1w', label: '1 week' },
  ];

  const runBacktest = async () => {
    if (strategyNodes.length === 0) {
      toast.error('Cannot backtest an empty strategy');
      return;
    }

    setIsBacktesting(true);
    setBacktestResults(null);

    try {
      // Prepare backtest parameters
      const backtestParams = {
        strategyName,
        symbol,
        timeframe,
        initialCapital,
        startDate: format(dateRange.from || addDays(new Date(), -90), 'yyyy-MM-dd'),
        endDate: format(dateRange.to || new Date(), 'yyyy-MM-dd'),
        strategy: JSON.stringify({
          nodes: strategyNodes,
          edges: strategyEdges
        })
      };

      // Run backtest
      const results = await backtest(backtestParams);

      if (results.success) {
        setBacktestResults(results.data);
        toast.success('Backtest completed successfully');
      } else {
        toast.error(`Backtest failed: ${results.error}`);
      }
    } catch (error) {
      console.error('Error running backtest:', error);
      toast.error('An error occurred while running the backtest');
    } finally {
      setIsBacktesting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  };

  // Format equity curve data
  const formatEquityCurveData = (equityCurve: { date: string; equity: number }[]) => {
    return equityCurve.map(point => ({
      date: format(new Date(point.date), 'MMM dd'),
      equity: point.equity
    }));
  };

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Backtest Settings</CardTitle>
          <CardDescription>
            Configure parameters for your backtest
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger id="symbol">
                <SelectValue placeholder="Select symbol" />
              </SelectTrigger>
              <SelectContent>
                {popularSymbols.map(symbol => (
                  <SelectItem key={symbol.value} value={symbol.value}>
                    {symbol.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeframe">Timeframe</Label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger id="timeframe">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                {timeframes.map(tf => (
                  <SelectItem key={tf.value} value={tf.value}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialCapital">Initial Capital</Label>
            <Input
              id="initialCapital"
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              min={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Date Range</Label>
            <DatePickerWithRange
              date={dateRange}
              setDate={setDateRange}
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button 
            className="w-full" 
            onClick={runBacktest}
            disabled={isBacktesting}
          >
            {isBacktesting ? (
              <>Running Backtest...</>
            ) : (
              <>
                <PlayIcon className="mr-2 h-4 w-4" />
                Run Backtest
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <div className="md:col-span-2 space-y-6">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Key performance metrics for your strategy
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isBacktesting ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : backtestResults ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Initial Capital</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(backtestResults.performance.initialCapital)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Final Capital</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(backtestResults.performance.finalCapital)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Return</p>
                  <p className={`text-xl font-semibold ${
                    backtestResults.performance.totalReturn >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatPercent(backtestResults.performance.totalReturn)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Drawdown</p>
                  <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                    {formatPercent(backtestResults.performance.maxDrawdown)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-xl font-semibold">
                    {formatPercent(backtestResults.performance.winRate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                  <p className="text-xl font-semibold">
                    {backtestResults.performance.sharpeRatio.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Profit Factor</p>
                  <p className="text-xl font-semibold">
                    {backtestResults.performance.profitFactor.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-xl font-semibold">
                    {backtestResults.performance.totalTrades}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <LineChart className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>Run a backtest to see performance metrics</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts and Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Backtest Analysis</CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
              <TabsList>
                <TabsTrigger value="equity">Equity Curve</TabsTrigger>
                <TabsTrigger value="trades">Trades</TabsTrigger>
                <TabsTrigger value="drawdowns">Drawdowns</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent>
            {isBacktesting ? (
              <div className="w-full h-[300px] flex items-center justify-center">
                <Skeleton className="h-[280px] w-full" />
              </div>
            ) : backtestResults ? (
              <>
                <TabsContent value="equity" className="mt-0">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart
                        data={formatEquityCurveData(backtestResults.equityCurve)}
                        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <RechartsTooltip 
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="equity"
                          stroke="hsl(var(--primary))"
                          activeDot={{ r: 6 }}
                          name="Account Equity"
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="trades" className="mt-0">
                  <div className="h-[300px] overflow-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-right p-2">Price</th>
                          <th className="text-right p-2">Quantity</th>
                          <th className="text-right p-2">P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backtestResults.trades.map((trade) => (
                          <tr key={trade.id} className="border-b">
                            <td className="p-2">{format(new Date(trade.date), 'MMM dd, yyyy')}</td>
                            <td className={`p-2 ${
                              trade.type === 'buy' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {trade.type.toUpperCase()}
                            </td>
                            <td className="p-2 text-right">{trade.price.toFixed(2)}</td>
                            <td className="p-2 text-right">{trade.quantity.toFixed(4)}</td>
                            <td className={`p-2 text-right ${
                              (trade.pnl || 0) >= 0
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {trade.pnl ? formatCurrency(trade.pnl) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="drawdowns" className="mt-0">
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">
                      Drawdown analysis will be available in a future update
                    </p>
                  </div>
                </TabsContent>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <LineChart className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-lg">Run a backtest to view results</p>
                <p className="text-sm mt-1">
                  Configure your settings and click "Run Backtest" to analyze your strategy
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BacktestPanel;
