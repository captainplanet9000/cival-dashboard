/**
 * Base Strategy Class
 * 
 * Abstract class that all trading strategies should extend to ensure
 * consistent implementation of required methods.
 */

import { 
  IStrategy, 
  StrategyMeta, 
  Signal, 
  Timeframe, 
  BacktestConfig, 
  BacktestResult,
  BacktestTrade,
  BacktestPerformance
} from './types';
import { MarketData } from '@/types/exchange';
import { RiskAwareOrderParams } from '@/lib/order/types';
import { createBrowserClient } from '@/utils/supabase/client';

export abstract class BaseStrategy implements IStrategy {
  protected parameters: Record<string, any> = {};
  protected supabase = createBrowserClient();
  protected initialized = false;
  protected signals: Signal[] = [];
  
  /**
   * Get strategy metadata - must be implemented by concrete classes
   */
  abstract getMeta(): StrategyMeta;
  
  /**
   * Validate strategy parameters
   */
  validateParameters(parameters: Record<string, any>): boolean {
    const meta = this.getMeta();
    const requiredParams = meta.parameters.filter(p => p.isRequired);
    
    // Check that all required parameters are provided
    for (const param of requiredParams) {
      if (parameters[param.id] === undefined) {
        console.error(`Missing required parameter: ${param.id}`);
        return false;
      }
      
      // Type validation
      if (param.type === 'number') {
        if (typeof parameters[param.id] !== 'number') {
          console.error(`Parameter ${param.id} must be a number`);
          return false;
        }
        
        // Range validation if min/max provided
        if (param.min !== undefined && parameters[param.id] < param.min) {
          console.error(`Parameter ${param.id} must be >= ${param.min}`);
          return false;
        }
        
        if (param.max !== undefined && parameters[param.id] > param.max) {
          console.error(`Parameter ${param.id} must be <= ${param.max}`);
          return false;
        }
      } else if (param.type === 'boolean' && typeof parameters[param.id] !== 'boolean') {
        console.error(`Parameter ${param.id} must be a boolean`);
        return false;
      } else if (param.type === 'string' && typeof parameters[param.id] !== 'string') {
        console.error(`Parameter ${param.id} must be a string`);
        return false;
      } else if (param.type === 'select' && !param.options?.includes(parameters[param.id])) {
        console.error(`Parameter ${param.id} must be one of: ${param.options?.join(', ')}`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Initialize the strategy with parameters
   */
  async initialize(parameters: Record<string, any>): Promise<boolean> {
    // Validate parameters
    if (!this.validateParameters(parameters)) {
      return false;
    }
    
    // Store parameters
    this.parameters = { ...parameters };
    this.initialized = true;
    return true;
  }
  
  /**
   * Process market data and generate signals - must be implemented by concrete classes
   */
  abstract process(marketData: MarketData[], timeframe: Timeframe): Promise<Signal[]>;
  
  /**
   * Base implementation of backtest method that can be overridden
   * by specific strategies if needed
   */
  async backtest(config: BacktestConfig): Promise<BacktestResult> {
    if (!this.initialized) {
      await this.initialize(config.parameters);
    }
    
    // Create backtest ID
    const backtestId = crypto.randomUUID();
    const startTime = new Date();
    
    try {
      // Fetch historical data for the timeframe and symbols
      const historicalData = await this.fetchHistoricalData(
        config.symbols, 
        config.timeframe, 
        new Date(config.startDate), 
        new Date(config.endDate)
      );
      
      if (!historicalData || !historicalData.length) {
        throw new Error('No historical data available for backtest');
      }
      
      // Process data chronologically and generate signals
      let signals: Signal[] = [];
      let trades: BacktestTrade[] = [];
      let equity = config.initialCapital;
      const equityCurve: { timestamp: string; equity: number }[] = [
        { timestamp: config.startDate, equity }
      ];
      
      // Group historical data by symbol
      const dataBySymbol: Record<string, MarketData[]> = {};
      for (const data of historicalData) {
        if (!dataBySymbol[data.symbol]) {
          dataBySymbol[data.symbol] = [];
        }
        dataBySymbol[data.symbol].push(data);
      }
      
      // Sort data points for each symbol by timestamp
      for (const symbol in dataBySymbol) {
        dataBySymbol[symbol].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
      
      // Find all unique timestamps across all symbols
      const allTimestamps = new Set<string>();
      for (const data of historicalData) {
        allTimestamps.add(data.timestamp);
      }
      
      // Sort timestamps chronologically
      const sortedTimestamps = Array.from(allTimestamps).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );
      
      // Simulate trading for each timestamp
      const openPositions: Record<string, BacktestTrade> = {};
      const dailyReturns: number[] = [];
      let previousDayEquity = config.initialCapital;
      let previousDay = '';
      
      for (const timestamp of sortedTimestamps) {
        // Create a data batch for this timestamp
        const dataBatch: MarketData[] = [];
        for (const symbol in dataBySymbol) {
          const dataPoint = dataBySymbol[symbol].find(d => d.timestamp === timestamp);
          if (dataPoint) {
            dataBatch.push(dataPoint);
          }
        }
        
        // Process the data and get signals
        if (dataBatch.length > 0) {
          const newSignals = await this.process(dataBatch, config.timeframe);
          signals = [...signals, ...newSignals];
          
          // Process signals to open/close trades
          for (const signal of newSignals) {
            const dataPoint = dataBatch.find(d => d.symbol === signal.symbol);
            if (!dataPoint) continue;
            
            // Handle trade logic
            if (
              (signal.type === 'BUY' || signal.type === 'STRONG_BUY') && 
              !openPositions[signal.symbol]
            ) {
              // Calculate position size (simplified)
              const positionSize = this.calculatePositionSize(
                equity, 
                dataPoint.price, 
                config.riskProfile
              );
              
              // Open a long position
              const trade: BacktestTrade = {
                id: crypto.randomUUID(),
                symbol: signal.symbol,
                entryType: 'BUY',
                entryPrice: dataPoint.price,
                entryTime: timestamp,
                positionSize,
                stopLoss: signal.metadata.stopLoss || dataPoint.price * 0.95, // Default 5% stop loss
                takeProfit: signal.metadata.takeProfit || dataPoint.price * 1.15, // Default 15% take profit
                fees: (positionSize * dataPoint.price) * (config.commission / 100),
                signalId: crypto.randomUUID()
              };
              
              openPositions[signal.symbol] = trade;
              trades.push(trade);
              
              // Deduct fees from equity
              equity -= trade.fees;
            } 
            else if (
              (signal.type === 'SELL' || signal.type === 'STRONG_SELL') && 
              openPositions[signal.symbol] && 
              openPositions[signal.symbol].entryType === 'BUY'
            ) {
              // Close a long position
              const trade = openPositions[signal.symbol];
              trade.exitPrice = dataPoint.price;
              trade.exitTime = timestamp;
              trade.fees += (trade.positionSize * dataPoint.price) * (config.commission / 100);
              
              // Calculate profit/loss
              const entryValue = trade.positionSize * trade.entryPrice;
              const exitValue = trade.positionSize * trade.exitPrice;
              trade.profit = exitValue - entryValue - trade.fees;
              trade.profitPercent = (trade.profit / entryValue) * 100;
              
              // Calculate risk-reward ratio
              if (trade.stopLoss && trade.takeProfit) {
                const risk = Math.abs(trade.entryPrice - trade.stopLoss);
                const reward = Math.abs(trade.takeProfit - trade.entryPrice);
                trade.riskRewardRatio = reward / risk;
              }
              
              // Calculate duration
              const entryDate = new Date(trade.entryTime).getTime();
              const exitDate = new Date(trade.exitTime).getTime();
              trade.duration = exitDate - entryDate;
              
              // Update equity
              equity += trade.profit;
              
              // Remove from open positions
              delete openPositions[signal.symbol];
            }
          }
          
          // Check stop loss and take profit for open positions
          for (const symbol in openPositions) {
            const trade = openPositions[symbol];
            const dataPoint = dataBatch.find(d => d.symbol === symbol);
            
            if (dataPoint) {
              // Check stop loss
              if (trade.stopLoss && trade.entryType === 'BUY' && dataPoint.price <= trade.stopLoss) {
                trade.exitPrice = trade.stopLoss; // Use exact stop loss price to avoid slippage confusion
                trade.exitTime = timestamp;
                trade.fees += (trade.positionSize * trade.exitPrice) * (config.commission / 100);
                
                // Calculate profit/loss
                const entryValue = trade.positionSize * trade.entryPrice;
                const exitValue = trade.positionSize * trade.exitPrice;
                trade.profit = exitValue - entryValue - trade.fees;
                trade.profitPercent = (trade.profit / entryValue) * 100;
                
                // Calculate duration
                const entryDate = new Date(trade.entryTime).getTime();
                const exitDate = new Date(trade.exitTime).getTime();
                trade.duration = exitDate - entryDate;
                
                // Update equity
                equity += trade.profit;
                
                // Remove from open positions
                delete openPositions[symbol];
              }
              // Check take profit
              else if (trade.takeProfit && trade.entryType === 'BUY' && dataPoint.price >= trade.takeProfit) {
                trade.exitPrice = trade.takeProfit; // Use exact take profit price
                trade.exitTime = timestamp;
                trade.fees += (trade.positionSize * trade.exitPrice) * (config.commission / 100);
                
                // Calculate profit/loss
                const entryValue = trade.positionSize * trade.entryPrice;
                const exitValue = trade.positionSize * trade.exitPrice;
                trade.profit = exitValue - entryValue - trade.fees;
                trade.profitPercent = (trade.profit / entryValue) * 100;
                
                // Calculate duration
                const entryDate = new Date(trade.entryTime).getTime();
                const exitDate = new Date(trade.exitTime).getTime();
                trade.duration = exitDate - entryDate;
                
                // Update equity
                equity += trade.profit;
                
                // Remove from open positions
                delete openPositions[symbol];
              }
            }
          }
          
          // Record equity for this timestamp
          equityCurve.push({ timestamp, equity });
          
          // Calculate daily returns
          const currentDay = new Date(timestamp).toISOString().split('T')[0];
          if (currentDay !== previousDay && previousDay !== '') {
            const dailyReturn = (equity - previousDayEquity) / previousDayEquity;
            dailyReturns.push(dailyReturn);
            previousDayEquity = equity;
          }
          previousDay = currentDay;
        }
      }
      
      // Close any remaining open positions at the last price
      for (const symbol in openPositions) {
        const trade = openPositions[symbol];
        const lastDataPoint = dataBySymbol[symbol][dataBySymbol[symbol].length - 1];
        
        trade.exitPrice = lastDataPoint.price;
        trade.exitTime = lastDataPoint.timestamp;
        trade.fees += (trade.positionSize * trade.exitPrice) * (config.commission / 100);
        
        // Calculate profit/loss
        const entryValue = trade.positionSize * trade.entryPrice;
        const exitValue = trade.positionSize * trade.exitPrice;
        trade.profit = exitValue - entryValue - trade.fees;
        trade.profitPercent = (trade.profit / entryValue) * 100;
        
        // Calculate duration
        const entryDate = new Date(trade.entryTime).getTime();
        const exitDate = new Date(trade.exitTime).getTime();
        trade.duration = exitDate - entryDate;
        
        // Update equity
        equity += trade.profit;
      }
      
      // Final equity curve point
      equityCurve.push({ 
        timestamp: new Date(config.endDate).toISOString(), 
        equity 
      });
      
      // Calculate performance metrics
      const performance = this.calculatePerformance(
        trades, 
        config.initialCapital, 
        equity, 
        dailyReturns, 
        equityCurve
      );
      
      // Calculate completion time
      const endTime = new Date();
      const completedAt = endTime.toISOString();
      
      return {
        id: backtestId,
        config,
        performance,
        trades,
        signals,
        createdAt: startTime.toISOString(),
        completedAt,
        status: 'completed'
      };
    } catch (error) {
      console.error('Backtest failed:', error);
      return {
        id: backtestId,
        config,
        performance: this.getEmptyPerformance(),
        trades: [],
        signals: [],
        createdAt: startTime.toISOString(),
        completedAt: new Date().toISOString(),
        status: 'failed',
        errorMessage: (error as Error).message
      };
    }
  }
  
  /**
   * Helper method to calculate position size based on risk parameters
   */
  protected calculatePositionSize(
    equity: number, 
    price: number,
    riskProfile: any
  ): number {
    // Get risk percentage from risk profile (default to 2%)
    const riskPercentage = riskProfile.parameters?.riskPerTrade || 2;
    
    // Calculate amount to risk
    const amountToRisk = equity * (riskPercentage / 100);
    
    // Assume 5% stop loss by default
    const stopLossPercentage = riskProfile.parameters?.stopLossPercentage || 5;
    
    // Calculate position size
    const positionSize = amountToRisk / (price * (stopLossPercentage / 100));
    
    return positionSize;
  }
  
  /**
   * Fetch historical market data for backtesting
   */
  protected async fetchHistoricalData(
    symbols: string[],
    timeframe: Timeframe,
    startDate: Date,
    endDate: Date
  ): Promise<MarketData[]> {
    try {
      const { data, error } = await this.supabase
        .from('historical_data')
        .select('*')
        .in('symbol', symbols)
        .eq('timeframe', timeframe)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      // Convert to MarketData format
      return data.map((item: any) => ({
        symbol: item.symbol,
        exchange: item.exchange,
        price: item.close, // Use close price as the main price
        bid: item.close,
        ask: item.close,
        volume24h: item.volume,
        high24h: item.high,
        low24h: item.low,
        timestamp: item.timestamp
      }));
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  }
  
  /**
   * Calculate performance metrics from backtest results
   */
  protected calculatePerformance(
    trades: BacktestTrade[],
    initialCapital: number,
    finalEquity: number,
    dailyReturns: number[],
    equityCurve: { timestamp: string; equity: number }[]
  ): BacktestPerformance {
    // Filter out trades without exit info
    const completedTrades = trades.filter(t => t.exitPrice !== undefined);
    
    if (completedTrades.length === 0) {
      return this.getEmptyPerformance();
    }
    
    // Calculate basic metrics
    const netProfit = finalEquity - initialCapital;
    const netProfitPercent = (netProfit / initialCapital) * 100;
    const totalTrades = completedTrades.length;
    
    const winningTrades = completedTrades.filter(t => (t.profit || 0) > 0).length;
    const losingTrades = completedTrades.filter(t => (t.profit || 0) <= 0).length;
    
    const winRate = winningTrades / totalTrades;
    
    const winningTradesData = completedTrades.filter(t => (t.profit || 0) > 0);
    const losingTradesData = completedTrades.filter(t => (t.profit || 0) <= 0);
    
    const averageWin = winningTradesData.length > 0
      ? winningTradesData.reduce((sum, t) => sum + (t.profit || 0), 0) / winningTradesData.length
      : 0;
      
    const averageLoss = losingTradesData.length > 0
      ? Math.abs(losingTradesData.reduce((sum, t) => sum + (t.profit || 0), 0)) / losingTradesData.length
      : 0;
    
    const profitFactor = averageLoss > 0
      ? (averageWin * winningTrades) / (averageLoss * losingTrades)
      : winningTrades > 0 ? Infinity : 0;
    
    // Calculate drawdown
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let peak = initialCapital;
    
    for (const point of equityCurve) {
      if (point.equity > peak) {
        peak = point.equity;
      } else {
        const drawdown = peak - point.equity;
        const drawdownPercent = (drawdown / peak) * 100;
        
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
          maxDrawdownPercent = drawdownPercent;
        }
      }
    }
    
    // Calculate Sharpe Ratio (annualized)
    const avgDailyReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const stdDevDailyReturn = Math.sqrt(
      dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / dailyReturns.length
    );
    
    const annualizedReturn = avgDailyReturn * 252; // Assuming 252 trading days
    const annualizedStdDev = stdDevDailyReturn * Math.sqrt(252);
    const sharpeRatio = annualizedStdDev > 0 ? annualizedReturn / annualizedStdDev : 0;
    
    // Calculate Sortino Ratio (using only negative returns)
    const negativeReturns = dailyReturns.filter(r => r < 0);
    const avgNegativeReturn = negativeReturns.length > 0
      ? negativeReturns.reduce((sum, r) => sum + r, 0) / negativeReturns.length
      : 0;
    const stdDevNegativeReturn = Math.sqrt(
      negativeReturns.reduce((sum, r) => sum + Math.pow(r - avgNegativeReturn, 2), 0) / (negativeReturns.length || 1)
    );
    
    const annualizedNegativeStdDev = stdDevNegativeReturn * Math.sqrt(252);
    const sortinoRatio = annualizedNegativeStdDev > 0 ? annualizedReturn / annualizedNegativeStdDev : 0;
    
    // Calculate total fees
    const totalFees = completedTrades.reduce((sum, t) => sum + t.fees, 0);
    
    // Calculate average trade duration in hours
    const totalDurationMs = completedTrades.reduce((sum, t) => sum + (t.duration || 0), 0);
    const averageDurationHours = (totalDurationMs / completedTrades.length) / (1000 * 60 * 60);
    
    // Calculate ROI
    const roi = netProfitPercent;
    
    // Calculate trades per day
    const firstTradeDate = new Date(completedTrades[0].entryTime).getTime();
    const lastTradeDate = new Date(completedTrades[completedTrades.length - 1].exitTime || '').getTime();
    const tradingDays = (lastTradeDate - firstTradeDate) / (1000 * 60 * 60 * 24);
    const tradesPerDay = totalTrades / (tradingDays || 1);
    
    // Calculate profit per day
    const profitPerDay = netProfit / (tradingDays || 1);
    
    // Calculate CAGR if more than a year
    let cagr;
    if (tradingDays > 365) {
      const years = tradingDays / 365;
      cagr = Math.pow(finalEquity / initialCapital, 1 / years) - 1;
    }
    
    return {
      netProfit,
      netProfitPercent,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      averageWin,
      averageLoss,
      profitFactor,
      maxDrawdown,
      maxDrawdownPercent,
      sharpeRatio,
      sortinoRatio,
      totalFees,
      averageDurationHours,
      roi,
      cagr,
      dailyReturns,
      equityCurve,
      tradesPerDay,
      profitPerDay
    };
  }
  
  /**
   * Get empty performance object (for failed backtests)
   */
  protected getEmptyPerformance(): BacktestPerformance {
    return {
      netProfit: 0,
      netProfitPercent: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      totalFees: 0,
      averageDurationHours: 0,
      roi: 0,
      dailyReturns: [],
      equityCurve: [],
      tradesPerDay: 0,
      profitPerDay: 0
    };
  }
}
