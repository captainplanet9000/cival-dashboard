import { Strategy, StrategyParams, MarketData } from './strategy-interface';
import { OHLCV, StrategyBacktestResult, Trade, TimeFrame } from '@/types/trading.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for a backtest run
 */
export interface BacktestConfig {
  strategyId: string;
  strategyParams: StrategyParams;
  startDate: Date;
  endDate: Date;
  symbols: string[];
  timeframes: TimeFrame[];
  initialCapital: number;
  feesPercentage: number;
  slippagePercentage: number;
  executionDelay: number; // milliseconds delay between signal and execution
  userId: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for a backtest trade
 */
interface BacktestTrade extends Trade {
  entryTime: string;
  exitTime?: string;
  profit: number;
  profitPercent: number;
  holdingPeriod: number; // in milliseconds
}

/**
 * Backtesting engine for evaluating trading strategies with historical data
 */
export class BacktestEngine {
  /**
   * Run a backtest for a strategy with historical data
   */
  async runBacktest(
    strategy: Strategy,
    config: BacktestConfig,
    historicalData: Record<string, OHLCV[]>
  ): Promise<StrategyBacktestResult> {
    // Reset strategy state
    strategy.reset();
    
    // Configure strategy with parameters
    strategy.configure(config.strategyParams);
    
    // Initialize backtest state
    const trades: BacktestTrade[] = [];
    const equityCurve: { timestamp: number; equity: number }[] = [
      { timestamp: config.startDate.getTime(), equity: config.initialCapital }
    ];
    
    let currentCapital = config.initialCapital;
    let openPositions: Record<string, {
      symbol: string;
      side: 'long' | 'short';
      entryPrice: number;
      quantity: number;
      entryTime: string;
      stopLoss?: number;
      takeProfit?: number;
    }> = {};
    
    // Convert historical data to required format for the strategy
    // We'll process it timeframe by timeframe in chronological order
    const timeframeData = this.organizeDataByTimeframe(historicalData, config.timeframes);
    
    // Process each timeframe's data chronologically
    for (const [timeframe, data] of Object.entries(timeframeData)) {
      // Sort data points by timestamp
      const sortedTimestamps = Object.keys(data)
        .map(Number)
        .sort((a, b) => a - b);
      
      // Process each timestamp
      for (const timestamp of sortedTimestamps) {
        const currentTime = new Date(timestamp);
        
        // Skip data before start date or after end date
        if (currentTime < config.startDate || currentTime > config.endDate) {
          continue;
        }
        
        // Get market data at this timestamp
        const marketData = this.prepareMarketData(data[timestamp], timeframe as TimeFrame);
        
        // Process market data with strategy
        const signals = strategy.processMarketData(marketData);
        
        // Process existing positions
        this.processOpenPositions(
          openPositions,
          marketData,
          currentTime,
          trades,
          currentCapital,
          config
        );
        
        // Process signals (with execution delay)
        for (const signal of signals) {
          // Apply execution delay
          const executionTime = new Date(
            currentTime.getTime() + config.executionDelay
          );
          
          // Skip if execution would be after end date
          if (executionTime > config.endDate) {
            continue;
          }
          
          // Calculate position size
          const symbol = signal.symbol;
          const price = signal.price!;
          
          // Apply slippage
          const slippageAdjustedPrice = signal.side === 'buy'
            ? price * (1 + config.slippagePercentage / 100)
            : price * (1 - config.slippagePercentage / 100);
          
          // Calculate position size based on risk parameters
          const positionSize = this.calculatePositionSize(
            currentCapital,
            slippageAdjustedPrice,
            signal.stopLoss,
            config.strategyParams.risk
          );
          
          // Calculate quantity
          const quantity = positionSize / slippageAdjustedPrice;
          
          // Check if we have sufficient capital
          const positionCost = quantity * slippageAdjustedPrice;
          if (positionCost > currentCapital) {
            continue; // Skip if insufficient capital
          }
          
          // Convert order side to position side
          const positionSide = signal.side === 'buy' ? 'long' : 'short';
          
          // Check if we already have a position for this symbol
          if (openPositions[symbol]) {
            // Close existing position first if it's in the opposite direction
            if (openPositions[symbol].side !== positionSide) {
              // Close the existing position
              const existingPosition = openPositions[symbol];
              const exitPrice = slippageAdjustedPrice;
              
              // Calculate profit/loss
              const profit = this.calculateProfit(
                existingPosition.side,
                existingPosition.entryPrice,
                exitPrice,
                existingPosition.quantity,
                config.feesPercentage
              );
              
              // Create trade record
              trades.push({
                id: uuidv4(),
                symbol,
                exchange: 'backtest',
                side: signal.side,
                price: exitPrice,
                quantity: existingPosition.quantity,
                value: existingPosition.quantity * exitPrice,
                fee: (existingPosition.quantity * exitPrice) * (config.feesPercentage / 100),
                feeCurrency: symbol.split('/')[1],
                timestamp: executionTime.toISOString(),
                orderId: uuidv4(),
                userId: config.userId,
                strategyId: config.strategyId,
                entryTime: existingPosition.entryTime,
                exitTime: executionTime.toISOString(),
                profit,
                profitPercent: (profit / (existingPosition.entryPrice * existingPosition.quantity)) * 100,
                holdingPeriod: executionTime.getTime() - new Date(existingPosition.entryTime).getTime(),
                metadata: {
                  backtest: true,
                  signal: signal.metadata
                }
              });
              
              // Update capital
              currentCapital += profit;
              
              // Remove the position
              delete openPositions[symbol];
            }
          }
          
          // Open new position
          if (!openPositions[symbol]) {
            // Create new position
            openPositions[symbol] = {
              symbol,
              side: positionSide,
              entryPrice: slippageAdjustedPrice,
              quantity,
              entryTime: executionTime.toISOString(),
              stopLoss: signal.stopLoss,
              takeProfit: signal.targetPrice
            };
            
            // Deduct cost from capital (including fees)
            const fees = positionCost * (config.feesPercentage / 100);
            currentCapital -= (positionCost + fees);
          }
        }
        
        // Record equity at this point
        equityCurve.push({
          timestamp: currentTime.getTime(),
          equity: this.calculateCurrentEquity(
            currentCapital,
            openPositions,
            marketData,
            config.feesPercentage
          )
        });
      }
    }
    
    // Close all remaining positions at the end of the backtest
    const finalMarketData = this.getFinalMarketData(historicalData, config.endDate);
    this.closeAllPositions(
      openPositions,
      finalMarketData,
      config.endDate,
      trades,
      currentCapital,
      config
    );
    
    // Calculate backtest metrics
    const metrics = this.calculateBacktestMetrics(
      trades,
      equityCurve,
      config.initialCapital
    );
    
    // Create the backtest result
    const result: StrategyBacktestResult = {
      id: uuidv4(),
      strategyId: config.strategyId,
      startTime: config.startDate.toISOString(),
      endTime: config.endDate.toISOString(),
      initialCapital: config.initialCapital,
      finalCapital: metrics.finalCapital,
      profit: metrics.profit,
      profitPercent: metrics.profitPercent,
      trades: metrics.totalTrades,
      winningTrades: metrics.winningTrades,
      losingTrades: metrics.losingTrades,
      maxDrawdown: metrics.maxDrawdown,
      maxDrawdownPercent: metrics.maxDrawdownPercent,
      sharpeRatio: metrics.sharpeRatio,
      sortinoRatio: metrics.sortinoRatio,
      parameters: config.strategyParams,
      metadata: {
        ...config.metadata,
        equityCurve,
        trades,
        performanceMetrics: metrics
      }
    };
    
    return result;
  }
  
  /**
   * Organize historical data by timeframe
   */
  private organizeDataByTimeframe(
    historicalData: Record<string, OHLCV[]>,
    timeframes: TimeFrame[]
  ): Record<string, Record<number, Record<string, OHLCV[]>>> {
    const result: Record<string, Record<number, Record<string, OHLCV[]>>> = {};
    
    // Initialize structure
    for (const timeframe of timeframes) {
      result[timeframe] = {};
    }
    
    // Process each symbol's data
    for (const [symbol, candles] of Object.entries(historicalData)) {
      for (const candle of candles) {
        const timestamp = candle.timestamp;
        const timeframe = this.determineTimeframe(candle, timeframes);
        
        // Skip if not in our target timeframes
        if (!timeframe) continue;
        
        // Initialize timestamp entry if needed
        if (!result[timeframe][timestamp]) {
          result[timeframe][timestamp] = {};
        }
        
        // Initialize symbol entry if needed
        if (!result[timeframe][timestamp][symbol]) {
          result[timeframe][timestamp][symbol] = [];
        }
        
        // Add candle
        result[timeframe][timestamp][symbol].push(candle);
      }
    }
    
    return result;
  }
  
  /**
   * Determine which timeframe a candle belongs to
   */
  private determineTimeframe(
    candle: OHLCV,
    timeframes: TimeFrame[]
  ): TimeFrame | null {
    // In a real implementation, this would determine the correct timeframe
    // For simplicity, we'll use the first timeframe
    return timeframes[0] || null;
  }
  
  /**
   * Prepare market data for strategy processing
   */
  private prepareMarketData(
    data: Record<string, OHLCV[]>,
    timeframe: TimeFrame
  ): MarketData {
    // Choose the first symbol (for simplicity)
    const symbol = Object.keys(data)[0];
    const candles = data[symbol] || [];
    
    // Return properly formatted market data
    return {
      candles: {
        symbol,
        timeframe,
        open: candles.map(c => c.open),
        high: candles.map(c => c.high),
        low: candles.map(c => c.low),
        close: candles.map(c => c.close),
        volume: candles.map(c => c.volume),
        timestamp: candles.map(c => c.timestamp)
      }
    };
  }
  
  /**
   * Process open positions for exits
   */
  private processOpenPositions(
    openPositions: Record<string, any>,
    marketData: MarketData,
    currentTime: Date,
    trades: BacktestTrade[],
    currentCapital: number,
    config: BacktestConfig
  ): void {
    // Get the latest prices
    const latestPrices: Record<string, number> = {};
    if (marketData.candles.close.length > 0) {
      const lastIndex = marketData.candles.close.length - 1;
      latestPrices[marketData.candles.symbol] = marketData.candles.close[lastIndex];
    }
    
    // Check each open position for exit conditions
    for (const symbol of Object.keys(openPositions)) {
      const position = openPositions[symbol];
      
      // Skip if we don't have price data for this symbol
      if (!latestPrices[symbol]) continue;
      
      const currentPrice = latestPrices[symbol];
      
      // Check stop loss
      if (position.stopLoss !== undefined) {
        if (
          (position.side === 'long' && currentPrice <= position.stopLoss) ||
          (position.side === 'short' && currentPrice >= position.stopLoss)
        ) {
          // Stop loss hit
          this.closePosition(
            symbol,
            position,
            position.stopLoss,
            currentTime,
            trades,
            currentCapital,
            config,
            'stop_loss'
          );
          
          // Remove position
          delete openPositions[symbol];
          continue;
        }
      }
      
      // Check take profit
      if (position.takeProfit !== undefined) {
        if (
          (position.side === 'long' && currentPrice >= position.takeProfit) ||
          (position.side === 'short' && currentPrice <= position.takeProfit)
        ) {
          // Take profit hit
          this.closePosition(
            symbol,
            position,
            position.takeProfit,
            currentTime,
            trades,
            currentCapital,
            config,
            'take_profit'
          );
          
          // Remove position
          delete openPositions[symbol];
        }
      }
    }
  }
  
  /**
   * Close a position and record the trade
   */
  private closePosition(
    symbol: string,
    position: any,
    exitPrice: number,
    exitTime: Date,
    trades: BacktestTrade[],
    currentCapital: number,
    config: BacktestConfig,
    exitReason: string
  ): void {
    // Apply slippage to exit price
    const slippageAdjustedPrice = position.side === 'long'
      ? exitPrice * (1 - config.slippagePercentage / 100)
      : exitPrice * (1 + config.slippagePercentage / 100);
    
    // Calculate profit/loss
    const profit = this.calculateProfit(
      position.side,
      position.entryPrice,
      slippageAdjustedPrice,
      position.quantity,
      config.feesPercentage
    );
    
    // Create trade record
    trades.push({
      id: uuidv4(),
      symbol,
      exchange: 'backtest',
      side: position.side === 'long' ? 'sell' : 'buy',
      price: slippageAdjustedPrice,
      quantity: position.quantity,
      value: position.quantity * slippageAdjustedPrice,
      fee: (position.quantity * slippageAdjustedPrice) * (config.feesPercentage / 100),
      feeCurrency: symbol.split('/')[1],
      timestamp: exitTime.toISOString(),
      orderId: uuidv4(),
      userId: config.userId,
      strategyId: config.strategyId,
      entryTime: position.entryTime,
      exitTime: exitTime.toISOString(),
      profit,
      profitPercent: (profit / (position.entryPrice * position.quantity)) * 100,
      holdingPeriod: exitTime.getTime() - new Date(position.entryTime).getTime(),
      metadata: {
        backtest: true,
        exitReason
      }
    });
    
    // Update capital
    currentCapital += profit;
  }
  
  /**
   * Close all open positions at the end of the backtest
   */
  private closeAllPositions(
    openPositions: Record<string, any>,
    finalMarketData: Record<string, number>,
    endDate: Date,
    trades: BacktestTrade[],
    currentCapital: number,
    config: BacktestConfig
  ): void {
    for (const symbol of Object.keys(openPositions)) {
      const position = openPositions[symbol];
      
      // Use final price or a reasonable default
      const finalPrice = finalMarketData[symbol] || position.entryPrice;
      
      // Close the position
      this.closePosition(
        symbol,
        position,
        finalPrice,
        endDate,
        trades,
        currentCapital,
        config,
        'end_of_backtest'
      );
    }
  }
  
  /**
   * Get final market data for closing positions
   */
  private getFinalMarketData(
    historicalData: Record<string, OHLCV[]>,
    endDate: Date
  ): Record<string, number> {
    const result: Record<string, number> = {};
    
    // Find closest price to end date for each symbol
    for (const [symbol, candles] of Object.entries(historicalData)) {
      // Sort by timestamp (descending)
      const sortedCandles = [...candles].sort((a, b) => b.timestamp - a.timestamp);
      
      // Find first candle before or at end date
      for (const candle of sortedCandles) {
        if (candle.timestamp <= endDate.getTime()) {
          result[symbol] = candle.close;
          break;
        }
      }
      
      // If no candle found, use the earliest one
      if (!result[symbol] && sortedCandles.length > 0) {
        result[symbol] = sortedCandles[sortedCandles.length - 1].close;
      }
    }
    
    return result;
  }
  
  /**
   * Calculate current equity (capital + open position values)
   */
  private calculateCurrentEquity(
    capital: number,
    openPositions: Record<string, any>,
    marketData: MarketData,
    feesPercentage: number
  ): number {
    let equity = capital;
    
    // Get the latest price
    const symbol = marketData.candles.symbol;
    if (marketData.candles.close.length > 0) {
      const lastIndex = marketData.candles.close.length - 1;
      const currentPrice = marketData.candles.close[lastIndex];
      
      // Add value of position for this symbol
      if (openPositions[symbol]) {
        const position = openPositions[symbol];
        
        // Calculate position value
        const positionValue = position.quantity * currentPrice;
        
        // Calculate unrealized profit/loss
        const profit = this.calculateProfit(
          position.side,
          position.entryPrice,
          currentPrice,
          position.quantity,
          feesPercentage
        );
        
        // Add to equity
        equity += profit;
      }
    }
    
    return equity;
  }
  
  /**
   * Calculate profit for a position
   */
  private calculateProfit(
    side: 'long' | 'short',
    entryPrice: number,
    exitPrice: number,
    quantity: number,
    feesPercentage: number
  ): number {
    // Calculate entry and exit values
    const entryValue = entryPrice * quantity;
    const exitValue = exitPrice * quantity;
    
    // Calculate fees
    const entryFee = entryValue * (feesPercentage / 100);
    const exitFee = exitValue * (feesPercentage / 100);
    
    // Calculate profit based on position side
    if (side === 'long') {
      return exitValue - entryValue - entryFee - exitFee;
    } else {
      return entryValue - exitValue - entryFee - exitFee;
    }
  }
  
  /**
   * Calculate position size based on risk parameters
   */
  private calculatePositionSize(
    capital: number,
    price: number,
    stopLoss: number | undefined,
    riskParams: any
  ): number {
    const maxPositionSize = capital * (riskParams.maxPositionSize / 100);
    
    if (!stopLoss) {
      // Default to max position size if no stop loss
      return maxPositionSize;
    }
    
    // Calculate risk amount
    const riskAmount = capital * (riskParams.maxDrawdown / 100);
    
    // Calculate risk per unit
    const riskPerUnit = Math.abs(price - stopLoss);
    
    if (riskPerUnit === 0) {
      return maxPositionSize;
    }
    
    // Calculate position size based on risk
    const positionValue = riskAmount / riskPerUnit * price;
    
    // Return the smaller of the two position sizes
    return Math.min(positionValue, maxPositionSize);
  }
  
  /**
   * Calculate backtest performance metrics
   */
  private calculateBacktestMetrics(
    trades: BacktestTrade[],
    equityCurve: { timestamp: number; equity: number }[],
    initialCapital: number
  ): {
    finalCapital: number;
    profit: number;
    profitPercent: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    sharpeRatio: number;
    sortinoRatio: number;
  } {
    // Default values
    let finalCapital = initialCapital;
    let profit = 0;
    let profitPercent = 0;
    const totalTrades = trades.length;
    let winningTrades = 0;
    let losingTrades = 0;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let sharpeRatio = 0;
    let sortinoRatio = 0;
    
    // Calculate profit metrics from trades
    if (trades.length > 0) {
      // Count winning and losing trades
      for (const trade of trades) {
        if (trade.profit > 0) {
          winningTrades++;
        } else if (trade.profit < 0) {
          losingTrades++;
        }
      }
    }
    
    // Calculate drawdown and returns from equity curve
    if (equityCurve.length > 1) {
      // Get final equity
      finalCapital = equityCurve[equityCurve.length - 1].equity;
      profit = finalCapital - initialCapital;
      profitPercent = (profit / initialCapital) * 100;
      
      // Calculate drawdown
      let highWaterMark = initialCapital;
      let maxDrawdownValue = 0;
      
      for (const point of equityCurve) {
        // Update high water mark
        if (point.equity > highWaterMark) {
          highWaterMark = point.equity;
        }
        
        // Calculate drawdown
        const drawdown = highWaterMark - point.equity;
        const drawdownPercent = (drawdown / highWaterMark) * 100;
        
        // Update max drawdown
        if (drawdown > maxDrawdownValue) {
          maxDrawdownValue = drawdown;
          maxDrawdown = drawdown;
          maxDrawdownPercent = drawdownPercent;
        }
      }
      
      // Calculate returns for Sharpe ratio
      const returns: number[] = [];
      for (let i = 1; i < equityCurve.length; i++) {
        const prevEquity = equityCurve[i - 1].equity;
        const currentEquity = equityCurve[i].equity;
        returns.push((currentEquity - prevEquity) / prevEquity);
      }
      
      // Calculate Sharpe ratio (simplified)
      if (returns.length > 0) {
        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const stdDev = Math.sqrt(
          returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
        );
        
        if (stdDev > 0) {
          // Annualized Sharpe ratio (approximately)
          sharpeRatio = (avgReturn / stdDev) * Math.sqrt(252); // Assuming daily returns
        }
        
        // Calculate Sortino ratio (using only negative returns)
        const negativeReturns = returns.filter(ret => ret < 0);
        if (negativeReturns.length > 0) {
          const downDev = Math.sqrt(
            negativeReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / negativeReturns.length
          );
          
          if (downDev > 0) {
            // Annualized Sortino ratio (approximately)
            sortinoRatio = (avgReturn / downDev) * Math.sqrt(252); // Assuming daily returns
          }
        }
      }
    }
    
    return {
      finalCapital,
      profit,
      profitPercent,
      totalTrades,
      winningTrades,
      losingTrades,
      maxDrawdown,
      maxDrawdownPercent,
      sharpeRatio,
      sortinoRatio
    };
  }
}
