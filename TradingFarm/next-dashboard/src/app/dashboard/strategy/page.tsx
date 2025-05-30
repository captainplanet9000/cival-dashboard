"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StrategyBuilder } from '@/components/strategy/StrategyBuilder';
import { BacktestRunner } from '@/components/backtesting/BacktestRunner';
import { BacktestResults } from '@/components/backtesting/BacktestResults';
import { Strategy, StrategyTemplate, BacktestParameters, StrategyType } from '@/types/backtesting';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Code, LineChart, RefreshCw, Layers } from 'lucide-react';

export default function StrategyPage() {
  const supabase = createClientComponentClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('builder');
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [backtestId, setBacktestId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // In a real app, we'd fetch from API
      // For demo, use mock data
      setStrategies(getMockStrategies());
      setTemplates(getMockTemplates());
    } catch (error) {
      console.error("Error loading strategies:", error);
      toast({
        variant: "destructive",
        title: "Failed to load strategies",
        description: "There was an error loading your strategies. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStrategy = () => {
    setSelectedStrategy(null);
    setActiveTab('builder');
  };

  const handleEditStrategy = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setActiveTab('builder');
  };

  const handleSaveStrategy = (strategy: Strategy) => {
    // Update local state with the new strategy
    const strategyExists = strategies.some(s => s.id === strategy.id);
    if (strategyExists) {
      setStrategies(strategies.map(s => s.id === strategy.id ? strategy : s));
    } else {
      // Add new strategy with a mock ID
      const newStrategy = {
        ...strategy,
        id: `strategy-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setStrategies([...strategies, newStrategy]);
    }
    
    toast({
      title: "Strategy Saved",
      description: "Your strategy has been successfully saved.",
    });
  };

  const handleBacktestStart = (params: BacktestParameters) => {
    // In a real app, we'd send this to an API endpoint
    console.log("Starting backtest with params:", params);
    // Generate a mock backtest ID
    const newBacktestId = `backtest-${Date.now()}`;
    setBacktestId(newBacktestId);
    setActiveTab('results');
  };

  const handleBacktestComplete = (resultId: string) => {
    toast({
      title: "Backtest Completed",
      description: "Your backtest has finished running successfully.",
    });
  };

  return (
    <div className="container py-10 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Strategy Development</h2>
          <p className="text-muted-foreground">
            Create, test, and optimize your trading strategies
          </p>
        </div>
        <Button onClick={handleCreateStrategy} className="gap-2">
          <Plus className="h-4 w-4" />
          New Strategy
        </Button>
      </div>
      
      <Separator />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-8">
          <TabsTrigger value="strategies" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>My Strategies</span>
          </TabsTrigger>
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span>Strategy Builder</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2" disabled={!backtestId}>
            <LineChart className="h-4 w-4" />
            <span>Backtest Results</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="strategies" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="relative overflow-hidden border shadow-sm">
                  <div className="absolute inset-0 bg-foreground/5 animate-pulse" />
                  <CardHeader>
                    <CardTitle className="h-6 bg-foreground/10 rounded w-2/3"></CardTitle>
                    <CardDescription className="h-4 bg-foreground/10 rounded w-1/2 mt-2"></CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-foreground/10 rounded w-full mb-2"></div>
                    <div className="h-4 bg-foreground/10 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))
            ) : strategies.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 px-4">
                <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No strategies yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first trading strategy to start backtesting
                </p>
                <Button onClick={handleCreateStrategy}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Strategy
                </Button>
              </div>
            ) : (
              strategies.map((strategy) => (
                <Card key={strategy.id} className="border shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{strategy.name}</CardTitle>
                      <Badge type={strategy.type} />
                    </div>
                    <CardDescription>
                      {strategy.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      Created {new Date(strategy.created_at || Date.now()).toLocaleDateString()}
                      {strategy.updated_at && strategy.updated_at !== strategy.created_at && 
                        ` • Updated ${new Date(strategy.updated_at).toLocaleDateString()}`}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditStrategy(strategy)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => {
                          setSelectedStrategy(strategy);
                          setActiveTab('builder');
                          setTimeout(() => setActiveTab('backtest'), 100);
                        }}
                      >
                        Backtest
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="builder" className="space-y-6">
          <StrategyBuilder 
            strategy={selectedStrategy || undefined} 
            templates={templates}
            onSave={handleSaveStrategy}
          />
        </TabsContent>
        
        <TabsContent value="backtest" className="space-y-6">
          <BacktestRunner 
            strategy={selectedStrategy || undefined}
            strategies={strategies}
            onBacktestStart={handleBacktestStart}
            onBacktestComplete={handleBacktestComplete}
          />
        </TabsContent>
        
        <TabsContent value="results" className="space-y-6">
          {backtestId && (
            <BacktestResults backtestId={backtestId} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper component for strategy type badges
function Badge({ type }: { type: StrategyType }) {
  let color = '';
  
  switch (type) {
    case StrategyType.TREND_FOLLOWING:
      color = 'bg-blue-500/10 text-blue-500 border-blue-200';
      break;
    case StrategyType.MEAN_REVERSION:
      color = 'bg-purple-500/10 text-purple-500 border-purple-200';
      break;
    case StrategyType.MOMENTUM:
      color = 'bg-green-500/10 text-green-500 border-green-200';
      break;
    case StrategyType.BREAKOUT:
      color = 'bg-amber-500/10 text-amber-500 border-amber-200';
      break;
    default:
      color = 'bg-gray-500/10 text-gray-500 border-gray-200';
  }
  
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${color}`}>
      {type.replace('_', ' ')}
    </span>
  );
}

// Mock data for development/testing
function getMockStrategies(): Strategy[] {
  return [
    {
      id: 'strategy-1',
      user_id: 'user-123',
      name: 'EMA Crossover Strategy',
      description: 'Simple strategy using exponential moving average crossovers for entry and exit signals',
      type: StrategyType.TREND_FOLLOWING,
      is_public: true,
      parameters: {
        ema_short: 9,
        ema_long: 21,
        stop_loss: 2.5,
        take_profit: 5.0
      },
      code: '# EMA Crossover Strategy\n# This strategy uses exponential moving average crossovers for entry and exit signals\n\ndef initialize(context):\n    # Set up parameters\n    context.ema_short = 9\n    context.ema_long = 21\n    context.stop_loss = 0.025  # 2.5%\n    context.take_profit = 0.05  # 5%\n    \n    # Symbols to trade\n    context.symbols = ["BTC/USDT"]\n    \ndef handle_data(context, data):\n    # Loop through each symbol\n    for symbol in context.symbols:\n        if symbol not in data:\n            continue\n            \n        prices = data[symbol]["close_history"]\n        if len(prices) < context.ema_long:\n            continue\n            \n        # Calculate EMAs\n        ema_short = calculate_ema(prices, context.ema_short)\n        ema_long = calculate_ema(prices, context.ema_long)\n        \n        current_position = context.portfolio.positions.get(symbol, 0)\n        \n        # Trading logic\n        if ema_short > ema_long:  # Bullish signal\n            if current_position <= 0:\n                order_target_percent(symbol, 0.95)  # Go long with 95% of portfolio\n                log(f"LONG: {symbol} at {prices[-1]}")\n        elif ema_short < ema_long:  # Bearish signal\n            if current_position >= 0:\n                order_target_percent(symbol, -0.95)  # Go short with 95% of portfolio\n                log(f"SHORT: {symbol} at {prices[-1]}")\n                \n# Helper function to calculate EMA\ndef calculate_ema(prices, period):\n    multiplier = 2 / (period + 1)\n    if len(prices) < period:\n        return prices[-1]\n    \n    ema = sum(prices[-period:]) / period  # SMA as initial value\n    for price in prices[-period:]:\n        ema = (price - ema) * multiplier + ema\n    return ema',
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'strategy-2',
      user_id: 'user-123',
      name: 'RSI Mean Reversion',
      description: 'Mean reversion strategy using RSI indicator to identify overbought and oversold conditions',
      type: StrategyType.MEAN_REVERSION,
      is_public: false,
      parameters: {
        rsi_period: 14,
        overbought: 70,
        oversold: 30
      },
      code: '# RSI Mean Reversion Strategy\n# This strategy uses the RSI indicator to identify overbought and oversold conditions\n\ndef initialize(context):\n    # Set up parameters\n    context.rsi_period = 14\n    context.overbought = 70\n    context.oversold = 30\n    \n    # Symbols to trade\n    context.symbols = ["BTC/USDT"]\n    \ndef handle_data(context, data):\n    # Loop through each symbol\n    for symbol in context.symbols:\n        if symbol not in data:\n            continue\n            \n        prices = data[symbol]["close_history"]\n        if len(prices) < context.rsi_period + 1:\n            continue\n            \n        # Calculate RSI\n        rsi = calculate_rsi(prices, context.rsi_period)\n        \n        current_position = context.portfolio.positions.get(symbol, 0)\n        \n        # Trading logic\n        if rsi < context.oversold:  # Oversold condition\n            if current_position <= 0:\n                order_target_percent(symbol, 0.95)  # Go long\n                log(f"LONG: {symbol} at {prices[-1]} (RSI: {rsi})")\n        elif rsi > context.overbought:  # Overbought condition\n            if current_position >= 0:\n                order_target_percent(symbol, -0.95)  # Go short\n                log(f"SHORT: {symbol} at {prices[-1]} (RSI: {rsi})")\n                \n# Helper function to calculate RSI\ndef calculate_rsi(prices, period):\n    if len(prices) <= period:\n        return 50  # Default to neutral if not enough data\n        \n    # Calculate price changes\n    deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]\n    \n    # Get gains and losses\n    gains = [d if d > 0 else 0 for d in deltas]\n    losses = [-d if d < 0 else 0 for d in deltas]\n    \n    # Calculate average gain and loss\n    avg_gain = sum(gains[-period:]) / period\n    avg_loss = sum(losses[-period:]) / period\n    \n    if avg_loss == 0:\n        return 100  # Prevent division by zero\n        \n    rs = avg_gain / avg_loss\n    rsi = 100 - (100 / (1 + rs))\n    \n    return rsi',
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'strategy-3',
      user_id: 'user-123',
      name: 'Bollinger Breakout',
      description: 'Breakout strategy using Bollinger Bands to identify volatility-based trading opportunities',
      type: StrategyType.BREAKOUT,
      is_public: true,
      parameters: {
        bollinger_period: 20,
        std_dev: 2.0,
        position_size: 0.9
      },
      code: '# Bollinger Breakout Strategy\n# This strategy uses Bollinger Bands to identify breakout opportunities\n\ndef initialize(context):\n    # Set up parameters\n    context.bollinger_period = 20\n    context.std_dev = 2.0\n    context.position_size = 0.9\n    \n    # Symbols to trade\n    context.symbols = ["BTC/USDT"]\n    \ndef handle_data(context, data):\n    # Loop through each symbol\n    for symbol in context.symbols:\n        if symbol not in data:\n            continue\n            \n        prices = data[symbol]["close_history"]\n        if len(prices) < context.bollinger_period:\n            continue\n            \n        # Calculate Bollinger Bands\n        middle_band, upper_band, lower_band = calculate_bollinger_bands(\n            prices, context.bollinger_period, context.std_dev\n        )\n        \n        current_price = prices[-1]\n        current_position = context.portfolio.positions.get(symbol, 0)\n        \n        # Trading logic\n        if current_price > upper_band:  # Upward breakout\n            if current_position <= 0:\n                order_target_percent(symbol, context.position_size)\n                log(f"LONG: {symbol} at {current_price} (Upper Band: {upper_band})")\n        elif current_price < lower_band:  # Downward breakout\n            if current_position >= 0:\n                order_target_percent(symbol, -context.position_size)\n                log(f"SHORT: {symbol} at {current_price} (Lower Band: {lower_band})")\n                \n# Helper function to calculate Bollinger Bands\ndef calculate_bollinger_bands(prices, period, std_dev):\n    if len(prices) < period:\n        return prices[-1], prices[-1], prices[-1]\n        \n    # Middle band = SMA\n    middle_band = sum(prices[-period:]) / period\n    \n    # Calculate standard deviation\n    squared_diff = [(price - middle_band) ** 2 for price in prices[-period:]]\n    variance = sum(squared_diff) / period\n    std = variance ** 0.5\n    \n    # Calculate upper and lower bands\n    upper_band = middle_band + (std_dev * std)\n    lower_band = middle_band - (std_dev * std)\n    \n    return middle_band, upper_band, lower_band',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ];
}

function getMockTemplates(): StrategyTemplate[] {
  return [
    {
      id: 'template-1',
      name: 'Moving Average Crossover',
      description: 'A trend-following strategy using short and long moving average crossovers',
      type: StrategyType.TREND_FOLLOWING,
      default_parameters: {
        short_period: 9,
        long_period: 21,
        use_ema: true
      },
      parameter_descriptions: {
        short_period: 'Short-term moving average period',
        long_period: 'Long-term moving average period',
        use_ema: 'Use exponential moving average instead of simple moving average'
      },
      code_template: '# Moving Average Crossover Strategy\n# This strategy uses moving average crossovers for entry and exit signals\n\ndef initialize(context):\n    # Set up parameters\n    context.short_period = {{short_period}}\n    context.long_period = {{long_period}}\n    context.use_ema = {{use_ema}}\n    \n    # Symbols to trade\n    context.symbols = ["BTC/USDT"]\n    \ndef handle_data(context, data):\n    # Loop through each symbol\n    for symbol in context.symbols:\n        if symbol not in data:\n            continue\n            \n        prices = data[symbol]["close_history"]\n        if len(prices) < context.long_period:\n            continue\n            \n        # Calculate moving averages\n        if context.use_ema:\n            short_ma = calculate_ema(prices, context.short_period)\n            long_ma = calculate_ema(prices, context.long_period)\n        else:\n            short_ma = calculate_sma(prices, context.short_period)\n            long_ma = calculate_sma(prices, context.long_period)\n        \n        current_position = context.portfolio.positions.get(symbol, 0)\n        \n        # Trading logic\n        if short_ma > long_ma:  # Bullish signal\n            if current_position <= 0:\n                order_target_percent(symbol, 0.95)  # Go long with 95% of portfolio\n                log(f"LONG: {symbol} at {prices[-1]}")\n        elif short_ma < long_ma:  # Bearish signal\n            if current_position >= 0:\n                order_target_percent(symbol, -0.95)  # Go short with 95% of portfolio\n                log(f"SHORT: {symbol} at {prices[-1]}")\n                \n# Helper functions\ndef calculate_sma(prices, period):\n    return sum(prices[-period:]) / period\n\ndef calculate_ema(prices, period):\n    multiplier = 2 / (period + 1)\n    if len(prices) < period:\n        return prices[-1]\n    \n    ema = sum(prices[-period:]) / period  # SMA as initial value\n    for price in prices[-period:]:\n        ema = (price - ema) * multiplier + ema\n    return ema',
      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'basic'
    },
    {
      id: 'template-2',
      name: 'RSI Oscillator',
      description: 'A mean reversion strategy using RSI to identify overbought and oversold conditions',
      type: StrategyType.MEAN_REVERSION,
      default_parameters: {
        rsi_period: 14,
        overbought_threshold: 70,
        oversold_threshold: 30
      },
      parameter_descriptions: {
        rsi_period: 'Number of periods to calculate RSI',
        overbought_threshold: 'RSI value above which the market is considered overbought',
        oversold_threshold: 'RSI value below which the market is considered oversold'
      },
      code_template: '# RSI Oscillator Strategy\n# This strategy uses RSI to identify overbought and oversold conditions\n\ndef initialize(context):\n    # Set up parameters\n    context.rsi_period = {{rsi_period}}\n    context.overbought_threshold = {{overbought_threshold}}\n    context.oversold_threshold = {{oversold_threshold}}\n    \n    # Symbols to trade\n    context.symbols = ["BTC/USDT"]\n    \ndef handle_data(context, data):\n    # Loop through each symbol\n    for symbol in context.symbols:\n        if symbol not in data:\n            continue\n            \n        prices = data[symbol]["close_history"]\n        if len(prices) < context.rsi_period + 1:\n            continue\n            \n        # Calculate RSI\n        rsi = calculate_rsi(prices, context.rsi_period)\n        \n        current_position = context.portfolio.positions.get(symbol, 0)\n        \n        # Trading logic\n        if rsi < context.oversold_threshold:  # Oversold condition\n            if current_position <= 0:\n                order_target_percent(symbol, 0.95)  # Go long\n                log(f"LONG: {symbol} at {prices[-1]} (RSI: {rsi})")\n        elif rsi > context.overbought_threshold:  # Overbought condition\n            if current_position >= 0:\n                order_target_percent(symbol, -0.95)  # Go short\n                log(f"SHORT: {symbol} at {prices[-1]} (RSI: {rsi})")\n                \n# Helper function to calculate RSI\ndef calculate_rsi(prices, period):\n    if len(prices) <= period:\n        return 50  # Default to neutral if not enough data\n        \n    # Calculate price changes\n    deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]\n    \n    # Get gains and losses\n    gains = [d if d > 0 else 0 for d in deltas]\n    losses = [-d if d < 0 else 0 for d in deltas]\n    \n    # Calculate average gain and loss\n    avg_gain = sum(gains[-period:]) / period\n    avg_loss = sum(losses[-period:]) / period\n    \n    if avg_loss == 0:\n        return 100  # Prevent division by zero\n        \n    rs = avg_gain / avg_loss\n    rsi = 100 - (100 / (1 + rs))\n    \n    return rsi',
      created_at: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'basic'
    },
    {
      id: 'template-3',
      name: 'Bollinger Band Breakout',
      description: 'A breakout strategy using Bollinger Bands to identify price movements beyond typical volatility',
      type: StrategyType.BREAKOUT,
      default_parameters: {
        bollinger_period: 20,
        bollinger_std: 2,
        exit_middle_band: true
      },
      parameter_descriptions: {
        bollinger_period: 'Number of periods for Bollinger Band calculation',
        bollinger_std: 'Number of standard deviations for band width',
        exit_middle_band: 'Exit positions when price crosses middle band'
      },
      code_template: '# Bollinger Band Breakout Strategy\n# This strategy uses Bollinger Bands to identify breakout opportunities\n\ndef initialize(context):\n    # Set up parameters\n    context.bollinger_period = {{bollinger_period}}\n    context.bollinger_std = {{bollinger_std}}\n    context.exit_middle_band = {{exit_middle_band}}\n    \n    # Symbols to trade\n    context.symbols = ["BTC/USDT"]\n    \ndef handle_data(context, data):\n    # Loop through each symbol\n    for symbol in context.symbols:\n        if symbol not in data:\n            continue\n            \n        prices = data[symbol]["close_history"]\n        if len(prices) < context.bollinger_period:\n            continue\n            \n        # Calculate Bollinger Bands\n        middle_band, upper_band, lower_band = calculate_bollinger_bands(\n            prices, context.bollinger_period, context.bollinger_std\n        )\n        \n        current_price = prices[-1]\n        current_position = context.portfolio.positions.get(symbol, 0)\n        \n        # Trading logic\n        if current_price > upper_band:  # Upper breakout\n            if current_position <= 0:\n                order_target_percent(symbol, 0.95)  # Go long\n                log(f"LONG: {symbol} at {current_price} (Upper Band: {upper_band})")\n        elif current_price < lower_band:  # Lower breakout\n            if current_position >= 0:\n                order_target_percent(symbol, -0.95)  # Go short\n                log(f"SHORT: {symbol} at {current_price} (Lower Band: {lower_band})")\n        elif context.exit_middle_band and current_position != 0:\n            # Exit at middle band crossing\n            if (current_position > 0 and current_price < middle_band) or \\\n               (current_position < 0 and current_price > middle_band):\n                order_target_percent(symbol, 0)  # Close position\n                log(f"EXIT: {symbol} at {current_price} (Middle Band: {middle_band})")\n                \n# Helper function to calculate Bollinger Bands\ndef calculate_bollinger_bands(prices, period, std_dev):\n    if len(prices) < period:\n        return prices[-1], prices[-1], prices[-1]\n        \n    # Middle band = SMA\n    middle_band = sum(prices[-period:]) / period\n    \n    # Calculate standard deviation\n    squared_diff = [(price - middle_band) ** 2 for price in prices[-period:]]\n    variance = sum(squared_diff) / period\n    std = variance ** 0.5\n    \n    # Calculate upper and lower bands\n    upper_band = middle_band + (std_dev * std)\n    lower_band = middle_band - (std_dev * std)\n    \n    return middle_band, upper_band, lower_band',
      created_at: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'basic'
    }
  ];
}
