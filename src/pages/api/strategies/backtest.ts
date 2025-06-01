import { RunBacktestParams, strategyService } from '../../../services';

/**
 * Handler for POST /api/strategies/backtest
 * Runs a backtest for a strategy and saves the results
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Required parameters
    const strategyId = body.strategyId;
    const strategyVersion = body.strategyVersion;
    const timeframe = body.timeframe;
    const startDate = body.startDate;
    const endDate = body.endDate;
    const market = body.market;
    const initialCapital = body.initialCapital || 10000;
    
    if (!strategyId) {
      return new Response(JSON.stringify({ error: 'Strategy ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!strategyVersion) {
      return new Response(JSON.stringify({ error: 'Strategy version is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!timeframe) {
      return new Response(JSON.stringify({ error: 'Timeframe is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: 'Start and end dates are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!market) {
      return new Response(JSON.stringify({ error: 'Market is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Run backtest simulation
    const backtestResults = await runBacktestSimulation({
      strategy_id: strategyId,
      strategy_version: strategyVersion,
      timeframe,
      start_date: startDate,
      end_date: endDate,
      market,
      initial_capital: initialCapital
    });
    
    // Save results to database
    const savedBacktest = await strategyService.saveBacktestResults({
      strategy_id: strategyId,
      strategy_version: strategyVersion,
      timeframe,
      start_date: startDate,
      end_date: endDate,
      market,
      initial_capital: initialCapital,
      results: backtestResults.trades,
      metrics: backtestResults.metrics
    });
    
    return new Response(JSON.stringify({
      backtest: savedBacktest,
      results: backtestResults
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error running backtest:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Runs a backtest simulation for a strategy
 * @param params Backtest parameters
 * @returns Backtest results
 */
async function runBacktestSimulation(params: RunBacktestParams): Promise<any> {
  // Get the strategy
  const strategy = await strategyService.getStrategyById(params.strategy_id);
  if (!strategy) {
    throw new Error(`Strategy not found: ${params.strategy_id}`);
  }
  
  // Get the strategy version
  const version = await strategyService.getVersion(params.strategy_id, params.strategy_version);
  if (!version) {
    throw new Error(`Strategy version not found: ${params.strategy_version}`);
  }
  
  // Get historical price data
  // In a real implementation, this would fetch actual historical data
  const priceData = await generateSamplePriceData(params.market, params.timeframe, params.start_date, params.end_date);
  
  // Run backtest
  const trades = [];
  let position = null;
  let balance = params.initial_capital;
  const balanceHistory = [{ timestamp: new Date(params.start_date).getTime(), balance }];
  
  const entryConditions = version.entry_conditions;
  const exitConditions = version.exit_conditions;
  const riskManagement = version.risk_management;
  
  for (let i = 1; i < priceData.length; i++) {
    const currentBar = priceData[i];
    const previousBar = priceData[i - 1];
    
    // Calculate indicators
    const indicators = calculateIndicators(priceData, i);
    
    // If we have a position, check exit conditions
    if (position) {
      const currentProfit = (currentBar.close - position.entryPrice) * position.size;
      const currentProfitPercent = (currentBar.close - position.entryPrice) / position.entryPrice * 100;
      
      // Check stop loss
      if (riskManagement.stopLoss && currentProfitPercent <= -riskManagement.stopLoss) {
        // Exit position due to stop loss
        trades.push({
          type: 'sell',
          reason: 'stop_loss',
          entryPrice: position.entryPrice,
          entryTime: position.entryTime,
          exitPrice: currentBar.close,
          exitTime: currentBar.timestamp,
          size: position.size,
          profit: currentProfit,
          profitPercent: currentProfitPercent
        });
        
        balance += position.size * currentBar.close;
        position = null;
      }
      // Check take profit
      else if (riskManagement.takeProfit && currentProfitPercent >= riskManagement.takeProfit) {
        // Exit position due to take profit
        trades.push({
          type: 'sell',
          reason: 'take_profit',
          entryPrice: position.entryPrice,
          entryTime: position.entryTime,
          exitPrice: currentBar.close,
          exitTime: currentBar.timestamp,
          size: position.size,
          profit: currentProfit,
          profitPercent: currentProfitPercent
        });
        
        balance += position.size * currentBar.close;
        position = null;
      }
      // Check other exit conditions
      else {
        let shouldExit = false;
        let exitReason = '';
        
        for (const condition of exitConditions) {
          if (isExitConditionMet(condition, currentBar, previousBar, indicators, position)) {
            shouldExit = true;
            exitReason = condition.description || condition.type;
            break;
          }
        }
        
        if (shouldExit) {
          trades.push({
            type: 'sell',
            reason: exitReason,
            entryPrice: position.entryPrice,
            entryTime: position.entryTime,
            exitPrice: currentBar.close,
            exitTime: currentBar.timestamp,
            size: position.size,
            profit: currentProfit,
            profitPercent: currentProfitPercent
          });
          
          balance += position.size * currentBar.close;
          position = null;
        }
      }
    }
    // If we don't have a position, check entry conditions
    else {
      let shouldEnter = false;
      let entryReason = '';
      
      for (const condition of entryConditions) {
        if (isEntryConditionMet(condition, currentBar, previousBar, indicators)) {
          shouldEnter = true;
          entryReason = condition.description || condition.type;
          break;
        }
      }
      
      if (shouldEnter) {
        // Calculate position size based on risk management
        const positionSizePercent = 1.0; // Default to 100% of available balance
        
        if (riskManagement.positionSizing) {
          const match = riskManagement.positionSizing.match(/(\d+\.?\d*)%/);
          if (match) {
            const percent = parseFloat(match[1]);
            const positionSizePercent = percent / 100;
          }
        }
        
        const positionValue = balance * positionSizePercent;
        const size = positionValue / currentBar.close;
        
        position = {
          entryPrice: currentBar.close,
          entryTime: currentBar.timestamp,
          size
        };
        
        balance -= positionValue;
      }
    }
    
    // Record balance history
    if (position) {
      const currentPositionValue = position.size * currentBar.close;
      balanceHistory.push({ 
        timestamp: currentBar.timestamp, 
        balance: balance + currentPositionValue 
      });
    } else {
      balanceHistory.push({ 
        timestamp: currentBar.timestamp, 
        balance 
      });
    }
  }
  
  // Close any open positions at the end of the backtest
  if (position) {
    const lastBar = priceData[priceData.length - 1];
    const currentProfit = (lastBar.close - position.entryPrice) * position.size;
    const currentProfitPercent = (lastBar.close - position.entryPrice) / position.entryPrice * 100;
    
    trades.push({
      type: 'sell',
      reason: 'backtest_end',
      entryPrice: position.entryPrice,
      entryTime: position.entryTime,
      exitPrice: lastBar.close,
      exitTime: lastBar.timestamp,
      size: position.size,
      profit: currentProfit,
      profitPercent: currentProfitPercent
    });
    
    balance += position.size * lastBar.close;
  }
  
  // Calculate backtest metrics
  const metrics = calculateBacktestMetrics(trades, params.initial_capital, balance, balanceHistory);
  
  return {
    trades,
    balanceHistory,
    metrics,
    finalBalance: balance
  };
}

/**
 * Generate sample price data for backtesting
 * @param market Market symbol
 * @param timeframe Timeframe
 * @param startDate Start date
 * @param endDate End date
 * @returns Sample price data
 */
async function generateSamplePriceData(market: string, timeframe: string, startDate: string, endDate: string) {
  // In a real implementation, this would fetch actual historical data from an API
  // For this example, we'll generate synthetic data
  
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  
  // Calculate interval in milliseconds based on timeframe
  let interval = 3600000; // Default to 1h
  switch (timeframe) {
    case '1m': interval = 60000; break;
    case '5m': interval = 300000; break;
    case '15m': interval = 900000; break;
    case '30m': interval = 1800000; break;
    case '1h': interval = 3600000; break;
    case '4h': interval = 14400000; break;
    case '1d': interval = 86400000; break;
    case '1w': interval = 604800000; break;
  }
  
  const data = [];
  let currentTime = start;
  let lastPrice = market.includes('BTC') ? 50000 : (market.includes('ETH') ? 3000 : 100);
  
  while (currentTime <= end) {
    // Generate random price movement (roughly -2% to +2%)
    const changePercent = (Math.random() * 4) - 2;
    const change = lastPrice * (changePercent / 100);
    
    const open = lastPrice;
    const close = lastPrice + change;
    const high = Math.max(open, close) + (Math.random() * Math.abs(change));
    const low = Math.min(open, close) - (Math.random() * Math.abs(change));
    const volume = Math.random() * 100 + 50;
    
    data.push({
      timestamp: currentTime,
      open,
      high,
      low,
      close,
      volume
    });
    
    lastPrice = close;
    currentTime += interval;
  }
  
  return data;
}

/**
 * Calculate technical indicators for backtesting
 * @param priceData Historical price data
 * @param index Current index in the price data array
 * @returns Calculated indicators
 */
function calculateIndicators(priceData: any[], index: number) {
  // Simple moving average calculation
  function calculateSMA(period: number) {
    if (index < period) return null;
    
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += priceData[index - i].close;
    }
    return sum / period;
  }
  
  // Calculate RSI
  function calculateRSI(period = 14) {
    if (index < period + 1) return null;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = index - period; i < index; i++) {
      const change = priceData[i].close - priceData[i - 1].close;
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    if (losses === 0) return 100;
    
    const relativeStrength = gains / losses;
    return 100 - (100 / (1 + relativeStrength));
  }
  
  return {
    SMA20: calculateSMA(20),
    SMA50: calculateSMA(50),
    SMA200: calculateSMA(200),
    RSI: calculateRSI(14)
  };
}

/**
 * Check if an entry condition is met
 * @param condition Entry condition
 * @param currentBar Current price bar
 * @param previousBar Previous price bar
 * @param indicators Calculated indicators
 * @returns True if the condition is met
 */
function isEntryConditionMet(condition: any, currentBar: any, previousBar: any, indicators: any) {
  switch (condition.type) {
    case 'indicator_threshold': {
      const { indicator, threshold, comparison } = condition.params;
      
      if (indicator === 'RSI' && indicators.RSI) {
        if (comparison === 'below') {
          return indicators.RSI < threshold;
        } else if (comparison === 'above') {
          return indicators.RSI > threshold;
        }
      }
      return false;
    }
    
    case 'moving_average_crossover': {
      const { shortPeriod, longPeriod, direction } = condition.params;
      
      const shortMA = indicators[`SMA${shortPeriod}`] || indicators.SMA50;
      const longMA = indicators[`SMA${longPeriod}`] || indicators.SMA200;
      
      if (!shortMA || !longMA) return false;
      
      if (direction === 'bullish') {
        // Check if short MA crosses above long MA
        return shortMA > longMA && previousBar.close < longMA;
      } else if (direction === 'bearish') {
        // Check if short MA crosses below long MA
        return shortMA < longMA && previousBar.close > longMA;
      }
      return false;
    }
    
    case 'price_action': {
      const { pattern } = condition.params;
      
      if (pattern === 'bullish_reversal') {
        // Simple pattern: price forms a higher low after a downtrend
        return currentBar.low > previousBar.low && previousBar.close < previousBar.open;
      }
      return false;
    }
    
    default:
      return false;
  }
}

/**
 * Check if an exit condition is met
 * @param condition Exit condition
 * @param currentBar Current price bar
 * @param previousBar Previous price bar
 * @param indicators Calculated indicators
 * @param position Current position
 * @returns True if the condition is met
 */
function isExitConditionMet(condition: any, currentBar: any, previousBar: any, indicators: any, position: any) {
  switch (condition.type) {
    case 'price_target': {
      const { targetType, value } = condition.params;
      
      if (targetType === 'percent') {
        const profitPercent = (currentBar.close - position.entryPrice) / position.entryPrice * 100;
        return profitPercent >= value;
      }
      return false;
    }
    
    case 'stop_loss': {
      const { stopType, value } = condition.params;
      
      if (stopType === 'percent') {
        const lossPercent = (position.entryPrice - currentBar.close) / position.entryPrice * 100;
        return lossPercent >= value;
      }
      return false;
    }
    
    case 'indicator_threshold': {
      const { indicator, threshold, comparison } = condition.params;
      
      if (indicator === 'RSI' && indicators.RSI) {
        if (comparison === 'below') {
          return indicators.RSI < threshold;
        } else if (comparison === 'above') {
          return indicators.RSI > threshold;
        }
      }
      return false;
    }
    
    case 'time_based': {
      const { timeframe, periods } = condition.params;
      
      if (position.entryTime) {
        const timeElapsed = currentBar.timestamp - position.entryTime;
        
        // Convert periods to milliseconds based on timeframe
        let timeframeMs = 3600000; // Default to 1h
        switch (timeframe) {
          case '1m': timeframeMs = 60000; break;
          case '5m': timeframeMs = 300000; break;
          case '15m': timeframeMs = 900000; break;
          case '30m': timeframeMs = 1800000; break;
          case '1h': timeframeMs = 3600000; break;
          case '4h': timeframeMs = 14400000; break;
          case '1d': timeframeMs = 86400000; break;
          case '1w': timeframeMs = 604800000; break;
        }
        
        return timeElapsed >= periods * timeframeMs;
      }
      return false;
    }
    
    default:
      return false;
  }
}

/**
 * Calculate backtest metrics
 * @param trades List of trades
 * @param initialCapital Initial capital
 * @param finalBalance Final balance
 * @param balanceHistory Balance history
 * @returns Backtest metrics
 */
function calculateBacktestMetrics(trades: any[], initialCapital: number, finalBalance: number, balanceHistory: any[]) {
  // Total profit/loss
  const totalProfitLoss = finalBalance - initialCapital;
  const totalProfitLossPercent = (totalProfitLoss / initialCapital) * 100;
  
  // Win rate
  const profitableTrades = trades.filter(trade => trade.profit > 0);
  const winRate = (profitableTrades.length / trades.length) * 100;
  
  // Average profit/loss
  const averageProfit = profitableTrades.length > 0 
    ? profitableTrades.reduce((sum, trade) => sum + trade.profitPercent, 0) / profitableTrades.length
    : 0;
  
  const losingTrades = trades.filter(trade => trade.profit <= 0);
  const averageLoss = losingTrades.length > 0
    ? losingTrades.reduce((sum, trade) => sum + trade.profitPercent, 0) / losingTrades.length
    : 0;
  
  // Profit factor
  const grossProfit = profitableTrades.reduce((sum, trade) => sum + trade.profit, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.profit, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  
  // Max drawdown
  let maxDrawdown = 0;
  let peakBalance = initialCapital;
  
  for (const point of balanceHistory) {
    if (point.balance > peakBalance) {
      peakBalance = point.balance;
    } else {
      const drawdown = (peakBalance - point.balance) / peakBalance * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }
  
  // Calculate Sharpe ratio (simplified)
  const returns = [];
  for (let i = 1; i < balanceHistory.length; i++) {
    const prevBalance = balanceHistory[i - 1].balance;
    const currentBalance = balanceHistory[i].balance;
    returns.push((currentBalance - prevBalance) / prevBalance);
  }
  
  const averageReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const stdDevReturns = Math.sqrt(
    returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) / returns.length
  );
  
  const sharpeRatio = stdDevReturns > 0 ? (averageReturn / stdDevReturns) * Math.sqrt(252) : 0;
  
  // Calculate expectancy
  const expectancy = (winRate / 100) * averageProfit + (1 - winRate / 100) * averageLoss;
  
  return {
    totalProfitLoss,
    totalProfitLossPercent,
    totalTrades: trades.length,
    profitableTrades: profitableTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    averageProfit,
    averageLoss,
    profitFactor,
    maxDrawdown,
    sharpeRatio,
    expectancy,
    initialCapital,
    finalBalance
  };
}

/**
 * Handler for OPTIONS /api/strategies/backtest
 * Handles preflight requests for CORS
 */
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 