"use client";

import { ExchangeConnector, OrderSide, OrderType, MarketData, Order, OrderResult } from "./exchange-connector";
import { AIAgentV2 } from "@/context/ai-agent-v2-context";
import { useToast } from "@/components/ui/use-toast";

/**
 * Indicator calculation result
 */
export interface IndicatorResult {
  value: number | string | boolean;
  signal?: "buy" | "sell" | "neutral";
  meta?: Record<string, any>;
}

/**
 * Base indicator interface
 */
export interface Indicator {
  name: string;
  symbol: string;
  timeframe: string;
  calculate(data: MarketData[]): IndicatorResult;
  getSignal(data: MarketData[]): "buy" | "sell" | "neutral";
  getParams(): Record<string, any>;
  setParams(params: Record<string, any>): void;
}

/**
 * Trading strategy result
 */
export interface StrategyResult {
  signal: "buy" | "sell" | "neutral";
  confidence: number;
  indicators: Record<string, IndicatorResult>;
  meta: Record<string, any>;
  timestamp: number;
}

/**
 * Trading position
 */
export interface Position {
  symbol: string;
  side: OrderSide;
  entryPrice: number;
  quantity: number;
  value: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  openTime: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
}

/**
 * Strategy Engine class for executing trading strategies
 */
export class StrategyEngine {
  private agent: AIAgentV2;
  private exchange: ExchangeConnector;
  private indicators: Record<string, Indicator> = {};
  private marketDataCache: Record<string, MarketData[]> = {};
  private strategyResults: StrategyResult[] = [];
  private positions: Position[] = [];
  private isRunning: boolean = false;
  private strategyInterval: any = null;
  private intervalMs: number = 60000; // Default to 1 minute
  private maxHistoricalDataPoints: number = 100;
  private riskPerTrade: number = 0.02; // 2% risk per trade
  private isBacktesting: boolean = false;
  private backtestResults: any[] = [];
  private eventListeners: Record<string, Function[]> = {};

  /**
   * Constructor for the Strategy Engine
   * @param agent Agent configuration
   * @param exchange Exchange connector
   */
  constructor(agent: AIAgentV2, exchange: ExchangeConnector) {
    this.agent = agent;
    this.exchange = exchange;
    this.initializeEngine();
  }

  /**
   * Initialize the strategy engine
   */
  private initializeEngine() {
    // Set interval based on agent settings
    this.setExecutionInterval();
    
    // Initialize indicators
    this.initializeIndicators();
    
    // Set risk parameters
    this.setRiskParameters();
  }

  /**
   * Set the execution interval based on agent settings
   */
  private setExecutionInterval() {
    // Map timeframe to milliseconds
    const timeframeMap: Record<string, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '30m': 1800000,
      '1h': 3600000,
      '4h': 14400000,
      'Daily': 86400000,
    };

    // Use the shortest timeframe from agent settings or default to 1 minute
    const timeframes = this.agent.settings.timeframes;
    if (timeframes && timeframes.length > 0) {
      // Find the minimum timeframe
      const minTimeframe = timeframes.reduce((min, current) => {
        const currentMs = timeframeMap[current] || 60000;
        return Math.min(min, currentMs);
      }, Number.MAX_SAFE_INTEGER);
      
      this.intervalMs = minTimeframe;
    }
  }

  /**
   * Initialize indicators based on agent settings
   */
  private initializeIndicators() {
    const indicators = this.agent.settings.indicators || [];
    
    // For each indicator in agent settings, create an indicator instance
    for (const indicatorName of indicators) {
      // In a real implementation, this would dynamically create indicator instances
      // For now, we'll create mock indicators
      this.createMockIndicator(indicatorName);
    }
  }

  /**
   * Create a mock indicator (for demonstration)
   */
  private createMockIndicator(name: string) {
    // Extract symbol and timeframe from agent settings
    const symbols = ['BTC/USDT']; // Mock symbol
    const timeframes = this.agent.settings.timeframes || ['1h'];
    
    // For each symbol and timeframe, create an indicator
    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        const key = `${name}-${symbol}-${timeframe}`;
        
        // Create a mock indicator
        this.indicators[key] = {
          name,
          symbol,
          timeframe,
          calculate: (data: MarketData[]) => {
            // Mock calculation based on indicator type
            let value: number = 0;
            let signal: "buy" | "sell" | "neutral" = "neutral";
            
            if (name === 'RSI') {
              value = 30 + Math.random() * 40; // Random RSI between 30 and 70
              signal = value < 30 ? "buy" : value > 70 ? "sell" : "neutral";
            } else if (name === 'Moving Averages') {
              const randomTrend = Math.random();
              value = randomTrend;
              signal = randomTrend > 0.6 ? "buy" : randomTrend < 0.4 ? "sell" : "neutral";
            } else {
              value = Math.random();
              signal = Math.random() > 0.6 ? "buy" : Math.random() < 0.3 ? "sell" : "neutral";
            }
            
            return {
              value,
              signal,
              meta: { lastUpdate: Date.now() }
            };
          },
          getSignal: (data: MarketData[]) => {
            const result = this.indicators[key].calculate(data);
            return result.signal || "neutral";
          },
          getParams: () => ({ name, symbol, timeframe }),
          setParams: (params: Record<string, any>) => {
            // Update params (would be implemented in a real indicator)
          }
        };
      }
    }
  }

  /**
   * Set risk parameters based on agent settings
   */
  private setRiskParameters() {
    // Map risk level to percentage
    const riskMap: Record<string, number> = {
      'low': 0.01, // 1% risk per trade
      'medium': 0.02, // 2% risk per trade
      'high': 0.05 // 5% risk per trade
    };
    
    // Set risk per trade based on agent settings
    this.riskPerTrade = riskMap[this.agent.settings.riskLevel] || 0.02;
  }

  /**
   * Start the strategy engine
   */
  public start(): boolean {
    if (this.isRunning) return false;
    
    this.isRunning = true;
    this.emit('started', { agentId: this.agent.id, timestamp: Date.now() });
    
    // Execute strategy immediately
    this.executeStrategy();
    
    // Set interval for regular execution
    this.strategyInterval = setInterval(() => {
      this.executeStrategy();
    }, this.intervalMs);
    
    return true;
  }

  /**
   * Stop the strategy engine
   */
  public stop(): boolean {
    if (!this.isRunning) return false;
    
    this.isRunning = false;
    
    if (this.strategyInterval) {
      clearInterval(this.strategyInterval);
      this.strategyInterval = null;
    }
    
    this.emit('stopped', { agentId: this.agent.id, timestamp: Date.now() });
    
    return true;
  }

  /**
   * Execute the trading strategy
   */
  public async executeStrategy(): Promise<StrategyResult> {
    try {
      // Check if running
      if (!this.isRunning && !this.isBacktesting) {
        throw new Error("Strategy engine is not running");
      }
      
      // Fetch market data for all required symbols
      await this.updateMarketData();
      
      // Calculate indicators
      const indicatorResults = this.calculateIndicators();
      
      // Generate trading signals
      const strategyResult = this.generateStrategySignal(indicatorResults);
      
      // Execute trades based on signals
      if (!this.isBacktesting) {
        this.executeTrades(strategyResult);
      }
      
      // Save strategy result
      this.strategyResults.push(strategyResult);
      if (this.strategyResults.length > 100) {
        this.strategyResults.shift(); // Keep only last 100 results
      }
      
      // Emit strategy execution event
      this.emit('strategyExecuted', {
        agentId: this.agent.id,
        result: strategyResult,
        timestamp: Date.now()
      });
      
      return strategyResult;
    } catch (error) {
      console.error(`Strategy execution error for agent ${this.agent.id}:`, error);
      this.emit('error', {
        agentId: this.agent.id,
        error,
        timestamp: Date.now()
      });
      
      // Return neutral signal on error
      return {
        signal: "neutral",
        confidence: 0,
        indicators: {},
        meta: { error: (error as Error).message },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Update market data cache
   */
  private async updateMarketData(): Promise<void> {
    // Get required symbols and timeframes
    const symbols = ['BTC/USDT']; // Mock symbol, in real app would come from agent config
    const timeframes = this.agent.settings.timeframes || ['1h'];
    
    // For each symbol, fetch current market data
    for (const symbol of symbols) {
      try {
        const data = await this.exchange.getMarketData(symbol);
        
        // Initialize cache for this symbol if it doesn't exist
        if (!this.marketDataCache[symbol]) {
          this.marketDataCache[symbol] = [];
        }
        
        // Add new data point
        this.marketDataCache[symbol].push(data);
        
        // Limit cache size
        if (this.marketDataCache[symbol].length > this.maxHistoricalDataPoints) {
          this.marketDataCache[symbol].shift();
        }
      } catch (error) {
        console.error(`Error fetching market data for ${symbol}:`, error);
        throw error;
      }
    }
  }

  /**
   * Calculate all indicators
   */
  private calculateIndicators(): Record<string, IndicatorResult> {
    const results: Record<string, IndicatorResult> = {};
    
    // Calculate each indicator
    for (const [key, indicator] of Object.entries(this.indicators)) {
      const symbol = indicator.symbol;
      const data = this.marketDataCache[symbol] || [];
      
      // Skip if not enough data
      if (data.length === 0) continue;
      
      // Calculate indicator
      results[key] = indicator.calculate(data);
    }
    
    return results;
  }

  /**
   * Generate strategy signal from indicator results
   */
  private generateStrategySignal(indicatorResults: Record<string, IndicatorResult>): StrategyResult {
    // Count buy and sell signals
    let buySignals = 0;
    let sellSignals = 0;
    let totalSignals = 0;
    
    // Process indicator results
    for (const result of Object.values(indicatorResults)) {
      if (result.signal === 'buy') buySignals++;
      else if (result.signal === 'sell') sellSignals++;
      
      totalSignals++;
    }
    
    // Generate overall signal
    let signal: "buy" | "sell" | "neutral" = "neutral";
    let confidence = 0;
    
    if (totalSignals > 0) {
      const buyRatio = buySignals / totalSignals;
      const sellRatio = sellSignals / totalSignals;
      
      // Determine signal based on majority and agent specialization
      // In a real implementation, this would be more sophisticated
      if (buyRatio > 0.6) {
        signal = "buy";
        confidence = buyRatio;
      } else if (sellRatio > 0.6) {
        signal = "sell";
        confidence = sellRatio;
      } else {
        signal = "neutral";
        confidence = 1 - Math.abs(buyRatio - sellRatio);
      }
      
      // Adjust based on agent specialization
      if (this.agent.specialization.includes('Trend Following') && signal !== "neutral") {
        confidence *= 1.2; // Boost confidence for trend following
      } else if (this.agent.specialization.includes('Mean Reversion')) {
        // For mean reversion, potentially invert the signal
        const currentPrice = this.getCurrentPrice('BTC/USDT');
        const avgPrice = this.getAveragePrice('BTC/USDT', 20);
        
        if (currentPrice && avgPrice) {
          const deviation = (currentPrice - avgPrice) / avgPrice;
          
          // If price is significantly above average and signal is buy, reduce confidence
          if (deviation > 0.05 && signal === "buy") {
            confidence *= 0.5;
          }
          // If price is significantly below average and signal is sell, reduce confidence
          else if (deviation < -0.05 && signal === "sell") {
            confidence *= 0.5;
          }
        }
      }
    }
    
    // Create strategy result
    return {
      signal,
      confidence: Math.min(confidence, 1), // Cap at 1
      indicators: indicatorResults,
      meta: {
        buySignals,
        sellSignals,
        totalSignals,
        timeframe: this.agent.settings.timeframes?.[0] || '1h',
        specialization: this.agent.specialization
      },
      timestamp: Date.now()
    };
  }

  /**
   * Execute trades based on strategy signal
   */
  private async executeTrades(strategyResult: StrategyResult): Promise<OrderResult | null> {
    // Skip if not a buy or sell signal, or confidence is too low
    if (strategyResult.signal === "neutral" || strategyResult.confidence < 0.7) {
      return null;
    }
    
    // Skip if maximum trades per day reached
    const tradesToday = this.getTradesExecutedToday();
    if (tradesToday >= this.agent.settings.tradesPerDay) {
      console.log(`Maximum trades per day (${this.agent.settings.tradesPerDay}) reached for agent ${this.agent.id}`);
      return null;
    }
    
    try {
      // Get current balance
      const balances = this.exchange.getBalances();
      const usdtBalance = balances.find(b => b.asset === 'USDT')?.free || 0;
      
      // Calculate position size based on risk
      const symbol = 'BTC/USDT';
      const price = this.getCurrentPrice(symbol) || 50000; // Fallback price
      
      // Calculate quantity based on risk and position sizing
      const positionSize = usdtBalance * this.agent.settings.positionSizing / 100;
      const quantity = positionSize / price;
      
      // Round quantity to appropriate precision
      const roundedQuantity = Math.floor(quantity * 100000) / 100000;
      
      // Skip if quantity is too small
      if (roundedQuantity <= 0) {
        console.log(`Calculated quantity too small for agent ${this.agent.id}`);
        return null;
      }
      
      // Create order
      const order: Order = {
        symbol,
        side: strategyResult.signal === "buy" ? OrderSide.BUY : OrderSide.SELL,
        type: OrderType.MARKET,
        quantity: roundedQuantity,
      };
      
      // Place order
      const result = await this.exchange.placeOrder(order);
      
      // Emit trade event
      this.emit('trade', {
        agentId: this.agent.id,
        order,
        result,
        strategyResult,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      console.error(`Error executing trade for agent ${this.agent.id}:`, error);
      this.emit('tradeError', {
        agentId: this.agent.id,
        error,
        strategyResult,
        timestamp: Date.now()
      });
      return null;
    }
  }

  /**
   * Get current price for a symbol
   */
  private getCurrentPrice(symbol: string): number | null {
    const data = this.marketDataCache[symbol];
    if (!data || data.length === 0) return null;
    return data[data.length - 1].price;
  }

  /**
   * Get average price for a symbol over a number of periods
   */
  private getAveragePrice(symbol: string, periods: number): number | null {
    const data = this.marketDataCache[symbol];
    if (!data || data.length === 0) return null;
    
    const relevantData = data.slice(-Math.min(periods, data.length));
    const sum = relevantData.reduce((total, item) => total + item.price, 0);
    return sum / relevantData.length;
  }

  /**
   * Get number of trades executed today
   */
  private getTradesExecutedToday(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.strategyResults.filter(r => {
      const resultDate = new Date(r.timestamp).toISOString().split('T')[0];
      return resultDate === today && (r.signal === "buy" || r.signal === "sell");
    }).length;
  }

  /**
   * Run backtest on historical data
   */
  public async runBacktest(startDate: Date, endDate: Date): Promise<any> {
    this.isBacktesting = true;
    this.backtestResults = [];
    
    try {
      // In a real implementation, this would fetch historical data and simulate trading
      // For demonstration, we'll generate mock backtest results
      
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      let currentBalance = 10000; // Start with $10,000
      let btcAmount = 0;
      const btcPrices: number[] = [];
      const balanceHistory: number[] = [];
      const trades: any[] = [];
      
      // Generate mock price data
      let currentPrice = 50000;
      for (let i = 0; i < days; i++) {
        const dailyChange = (Math.random() * 0.06) - 0.03; // -3% to +3% daily change
        currentPrice = currentPrice * (1 + dailyChange);
        btcPrices.push(currentPrice);
        
        const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        
        // Generate mock trades
        if (Math.random() > 0.7) { // 30% chance of trade per day
          const isBuy = Math.random() > 0.5;
          
          if (isBuy && currentBalance > 0) {
            const amount = currentBalance * 0.2; // Use 20% of available balance
            const quantity = amount / currentPrice;
            currentBalance -= amount;
            btcAmount += quantity;
            
            trades.push({
              date: currentDate.toISOString(),
              type: "buy",
              price: currentPrice,
              amount: amount,
              quantity: quantity
            });
          } else if (!isBuy && btcAmount > 0) {
            const quantity = btcAmount * 0.5; // Sell 50% of holdings
            const amount = quantity * currentPrice;
            currentBalance += amount;
            btcAmount -= quantity;
            
            trades.push({
              date: currentDate.toISOString(),
              type: "sell",
              price: currentPrice,
              amount: amount,
              quantity: quantity
            });
          }
        }
        
        // Calculate total value
        const totalValue = currentBalance + (btcAmount * currentPrice);
        balanceHistory.push(totalValue);
      }
      
      const initialValue = 10000;
      const finalValue = balanceHistory[balanceHistory.length - 1];
      const percentReturn = ((finalValue - initialValue) / initialValue) * 100;
      const tradeCount = trades.length;
      
      // Calculate win rate
      let winCount = 0;
      for (let i = 0; i < trades.length; i++) {
        const trade = trades[i];
        if (trade.type === "buy") {
          // Find next sell after this buy
          const nextSell = trades.slice(i+1).find(t => t.type === "sell");
          if (nextSell && nextSell.price > trade.price) {
            winCount++;
          }
        }
      }
      const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0;
      
      const results = {
        initialValue,
        finalValue,
        percentReturn,
        tradeCount,
        winRate,
        trades,
        priceHistory: btcPrices,
        balanceHistory,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        agent: this.agent.id
      };
      
      this.backtestResults = results;
      this.emit('backtestCompleted', results);
      
      return results;
    } finally {
      this.isBacktesting = false;
    }
  }

  /**
   * Get latest strategy result
   */
  public getLatestResult(): StrategyResult | null {
    if (this.strategyResults.length === 0) return null;
    return this.strategyResults[this.strategyResults.length - 1];
  }

  /**
   * Get current positions
   */
  public getPositions(): Position[] {
    return [...this.positions];
  }

  /**
   * Update current positions based on market data
   */
  public updatePositions(): void {
    // In a real implementation, this would fetch positions from the exchange
    // For demonstration, we'll update mock positions
    
    const symbol = 'BTC/USDT';
    const currentPrice = this.getCurrentPrice(symbol);
    
    if (!currentPrice) return;
    
    // Update unrealized PnL
    this.positions = this.positions.map(position => {
      if (position.symbol === symbol) {
        const newValue = position.quantity * currentPrice;
        const priceDiff = position.side === OrderSide.BUY 
          ? currentPrice - position.entryPrice
          : position.entryPrice - currentPrice;
        const unrealizedPnL = priceDiff * position.quantity;
        const unrealizedPnLPercent = (priceDiff / position.entryPrice) * 100;
        
        return {
          ...position,
          value: newValue,
          unrealizedPnL,
          unrealizedPnLPercent
        };
      }
      return position;
    });
  }

  /**
   * Add event listener
   */
  public on(event: string, callback: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  public off(event: string, callback: Function): void {
    if (!this.eventListeners[event]) return;
    
    this.eventListeners[event] = this.eventListeners[event].filter(
      listener => listener !== callback
    );
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    if (!this.eventListeners[event]) return;
    
    for (const listener of this.eventListeners[event]) {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    }
  }
}

/**
 * React hook for using the strategy engine
 */
export function useStrategyEngine(agent: AIAgentV2, exchange: ExchangeConnector) {
  const { toast } = useToast();
  
  // Create a new strategy engine instance (in a real app, this would be done with useState/useRef)
  const engine = new StrategyEngine(agent, exchange);
  
  // Start the engine with toast notification
  const startWithToast = () => {
    try {
      const success = engine.start();
      if (success) {
        toast({
          title: "Strategy Started",
          description: `Started trading strategy for agent ${agent.name}`,
        });
      }
      return success;
    } catch (error) {
      toast({
        title: "Strategy Start Failed",
        description: `Failed to start strategy: ${(error as Error).message}`,
        variant: "destructive",
      });
      return false;
    }
  };
  
  // Stop the engine with toast notification
  const stopWithToast = () => {
    try {
      const success = engine.stop();
      if (success) {
        toast({
          title: "Strategy Stopped",
          description: `Stopped trading strategy for agent ${agent.name}`,
        });
      }
      return success;
    } catch (error) {
      toast({
        title: "Strategy Stop Failed",
        description: `Failed to stop strategy: ${(error as Error).message}`,
        variant: "destructive",
      });
      return false;
    }
  };
  
  return {
    engine,
    start: startWithToast,
    stop: stopWithToast,
    executeStrategy: () => engine.executeStrategy(),
    getLatestResult: () => engine.getLatestResult(),
    getPositions: () => engine.getPositions(),
    updatePositions: () => engine.updatePositions(),
    runBacktest: (startDate: Date, endDate: Date) => engine.runBacktest(startDate, endDate),
    on: (event: string, callback: Function) => engine.on(event, callback),
    off: (event: string, callback: Function) => engine.off(event, callback),
  };
}
