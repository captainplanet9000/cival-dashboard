import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { getHistoricalData, Candle } from './historical-data';
import { getBrainAssetById, linkBrainAssetToStrategy, BrainAsset } from './brain-assets';

// Backtesting types
export interface BacktestOptions {
  strategyId: number;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  brainAssetIds: number[]; // IDs of brain assets to use in backtest
  strategyParams: Record<string, any>;
  source?: string;
}

export interface BacktestResult {
  id?: number;
  strategyId: number;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercentage: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  largestWin: number;
  largestLoss: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  maxDrawdownPercentage: number;
  sharpeRatio: number;
  trades: Trade[];
  equityCurve: EquityPoint[];
  strategyParams: Record<string, any>;
  brainAssets: {
    id: number;
    title: string;
    assetType: string;
    role: string;
  }[];
}

export interface Trade {
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  direction: 'long' | 'short';
  quantity: number;
  pnl: number;
  pnlPercentage: number;
  fees: number;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  drawdown: number;
  drawdownPercentage: number;
}

export interface PineScriptIndicatorValue {
  timestamp: string;
  values: Record<string, number>;
}

export interface BacktestSignal {
  timestamp: string;
  type: 'entry' | 'exit';
  direction: 'long' | 'short';
  price: number;
  reason: string;
}

/**
 * Run a backtest using strategy configuration and brain assets
 */
export async function runBacktest(options: BacktestOptions): Promise<BacktestResult> {
  // Fetch historical data
  const candles = await getHistoricalData({
    symbol: options.symbol,
    timeframe: options.timeframe,
    startDate: options.startDate,
    endDate: options.endDate,
    source: options.source
  });
  
  if (candles.length === 0) {
    throw new Error('No historical data available for backtesting');
  }
  
  // Fetch brain assets
  const brainAssets = await Promise.all(
    options.brainAssetIds.map(async (id) => {
      try {
        return await getBrainAssetById(id);
      } catch (error) {
        console.error(`Error fetching brain asset ${id}:`, error);
        return null;
      }
    })
  );
  
  // Filter out any null assets
  const validBrainAssets = brainAssets.filter(asset => asset !== null) as BrainAsset[];
  
  // Prepare brain assets by type for the backtest
  const pineScriptAssets = validBrainAssets.filter(asset => asset.asset_type === 'pinescript');
  const documentAssets = validBrainAssets.filter(asset => ['pdf', 'text', 'markdown'].includes(asset.asset_type));
  
  // Process PineScript indicators
  const indicators = await processIndicators(candles, pineScriptAssets);
  
  // Generate trading signals from indicators and strategy logic
  const signals = generateSignals(candles, indicators, options.strategyParams);
  
  // Execute trades based on signals
  const trades = executeTrades(candles, signals, options.initialCapital, options.strategyParams);
  
  // Calculate equity curve
  const equityCurve = calculateEquityCurve(options.initialCapital, trades, candles);
  
  // Calculate performance metrics
  const metrics = calculatePerformanceMetrics(options.initialCapital, trades, equityCurve);
  
  // Construct the final result
  const result: BacktestResult = {
    strategyId: options.strategyId,
    symbol: options.symbol,
    timeframe: options.timeframe,
    startDate: options.startDate,
    endDate: options.endDate,
    initialCapital: options.initialCapital,
    finalCapital: metrics.finalCapital,
    totalReturn: metrics.totalReturn,
    totalReturnPercentage: metrics.totalReturnPercentage,
    winRate: metrics.winRate,
    totalTrades: metrics.totalTrades,
    winningTrades: metrics.winningTrades,
    losingTrades: metrics.losingTrades,
    largestWin: metrics.largestWin,
    largestLoss: metrics.largestLoss,
    averageWin: metrics.averageWin,
    averageLoss: metrics.averageLoss,
    maxDrawdown: metrics.maxDrawdown,
    maxDrawdownPercentage: metrics.maxDrawdownPercentage,
    sharpeRatio: metrics.sharpeRatio,
    trades,
    equityCurve,
    strategyParams: options.strategyParams,
    brainAssets: validBrainAssets.map(asset => ({
      id: asset.id,
      title: asset.title,
      assetType: asset.asset_type,
      role: 'indicator', // Default role, would be more specific in a real implementation
    })),
  };
  
  // Save the backtest result to the database
  const savedResult = await saveBacktestResult(result);
  
  return savedResult;
}

/**
 * Process PineScript indicators from brain assets
 */
async function processIndicators(
  candles: Candle[],
  pineScriptAssets: BrainAsset[]
): Promise<Record<string, PineScriptIndicatorValue[]>> {
  const indicatorResults: Record<string, PineScriptIndicatorValue[]> = {};
  
  // Process each PineScript asset
  for (const asset of pineScriptAssets) {
    try {
      // In a real implementation, we would:
      // 1. Parse the PineScript code
      // 2. Convert it to JavaScript or run it in a PineScript interpreter
      // 3. Apply it to the candles to generate indicator values
      
      // For now, we'll simulate indicator values
      const indicatorValues = candles.map(candle => {
        const timestamp = candle.timestamp;
        
        // Generate random indicator values based on the asset title
        // In a real implementation, this would be calculated from the PineScript logic
        const values: Record<string, number> = {};
        
        if (asset.title.toLowerCase().includes('rsi')) {
          // Simulate RSI values (0-100)
          values['rsi'] = Math.min(100, Math.max(0, 50 + (Math.random() * 40 - 20)));
        } else if (asset.title.toLowerCase().includes('macd')) {
          // Simulate MACD values
          values['macd'] = Math.random() * 100 - 50;
          values['signal'] = Math.random() * 100 - 50;
          values['histogram'] = values['macd'] - values['signal'];
        } else if (asset.title.toLowerCase().includes('bollinger')) {
          // Simulate Bollinger Bands
          const price = candle.close;
          values['middle'] = price;
          values['upper'] = price * (1 + Math.random() * 0.05);
          values['lower'] = price * (1 - Math.random() * 0.05);
        } else {
          // Generic indicator
          values['value'] = Math.random() * 100;
        }
        
        return { timestamp, values };
      });
      
      indicatorResults[asset.id.toString()] = indicatorValues;
    } catch (error) {
      console.error(`Error processing indicator for asset ${asset.id}:`, error);
    }
  }
  
  return indicatorResults;
}

/**
 * Generate trading signals from candles and indicators
 */
function generateSignals(
  candles: Candle[],
  indicators: Record<string, PineScriptIndicatorValue[]>,
  strategyParams: Record<string, any>
): BacktestSignal[] {
  const signals: BacktestSignal[] = [];
  
  // In a real implementation, we would use the indicator values
  // and strategy parameters to generate signals based on actual logic
  
  // For demonstration purposes, we'll generate simple signals
  // based on random crossovers and thresholds
  let position: 'long' | 'short' | null = null;
  
  for (let i = 20; i < candles.length; i++) {
    const candle = candles[i];
    
    // Simple random trading strategy
    const random = Math.random();
    
    if (position === null) {
      // No position, look for entry
      if (random < 0.1) { // 10% chance of entry per candle
        const direction = random < 0.05 ? 'long' : 'short';
        position = direction;
        
        signals.push({
          timestamp: candle.timestamp,
          type: 'entry',
          direction,
          price: candle.close,
          reason: `${direction === 'long' ? 'Bullish' : 'Bearish'} signal`
        });
      }
    } else {
      // In position, look for exit
      if (random < 0.2) { // 20% chance of exit per candle
        signals.push({
          timestamp: candle.timestamp,
          type: 'exit',
          direction: position,
          price: candle.close,
          reason: 'Exit signal'
        });
        
        position = null;
      }
    }
  }
  
  // Ensure we close any open position at the end
  if (position !== null) {
    signals.push({
      timestamp: candles[candles.length - 1].timestamp,
      type: 'exit',
      direction: position,
      price: candles[candles.length - 1].close,
      reason: 'End of backtest'
    });
  }
  
  return signals;
}

/**
 * Execute trades based on signals
 */
function executeTrades(
  candles: Candle[],
  signals: BacktestSignal[],
  initialCapital: number,
  strategyParams: Record<string, any>
): Trade[] {
  const trades: Trade[] = [];
  let capital = initialCapital;
  let position: 'long' | 'short' | null = null;
  let entryTime: string | null = null;
  let entryPrice: number | null = null;
  let quantity: number | null = null;
  
  // Process signals to generate trades
  for (const signal of signals) {
    if (signal.type === 'entry' && position === null) {
      // Enter a new position
      position = signal.direction;
      entryTime = signal.timestamp;
      entryPrice = signal.price;
      
      // Calculate position size (simplified)
      const positionSize = capital * (strategyParams.riskPerTrade || 0.02); // Default to 2% risk
      quantity = positionSize / entryPrice;
      
    } else if (signal.type === 'exit' && position !== null && entryTime !== null && entryPrice !== null && quantity !== null) {
      // Exit existing position
      const exitTime = signal.timestamp;
      const exitPrice = signal.price;
      
      // Calculate P&L
      let pnl: number;
      if (position === 'long') {
        pnl = (exitPrice - entryPrice) * quantity;
      } else { // short
        pnl = (entryPrice - exitPrice) * quantity;
      }
      
      // Apply fees (simplified)
      const fees = (entryPrice + exitPrice) * quantity * (strategyParams.feeRate || 0.001); // Default to 0.1% fee
      pnl -= fees;
      
      // Update capital
      capital += pnl;
      
      // Calculate P&L percentage
      const entryValue = entryPrice * quantity;
      const pnlPercentage = (pnl / entryValue) * 100;
      
      // Add trade to list
      trades.push({
        entryTime,
        exitTime,
        entryPrice,
        exitPrice,
        direction: position,
        quantity,
        pnl,
        pnlPercentage,
        fees
      });
      
      // Reset position
      position = null;
      entryTime = null;
      entryPrice = null;
      quantity = null;
    }
  }
  
  return trades;
}

/**
 * Calculate equity curve from trades
 */
function calculateEquityCurve(
  initialCapital: number,
  trades: Trade[],
  candles: Candle[]
): EquityPoint[] {
  const equityCurve: EquityPoint[] = [];
  let capital = initialCapital;
  let highWaterMark = initialCapital;
  
  // Map trades to their timestamp for quick lookup
  const tradesByExit = new Map<string, Trade>();
  trades.forEach(trade => {
    tradesByExit.set(trade.exitTime, trade);
  });
  
  // Generate equity curve for each candle
  candles.forEach(candle => {
    // Check if a trade was completed at this timestamp
    const trade = tradesByExit.get(candle.timestamp);
    if (trade) {
      capital += trade.pnl;
    }
    
    // Update high water mark
    highWaterMark = Math.max(highWaterMark, capital);
    
    // Calculate drawdown
    const drawdown = highWaterMark - capital;
    const drawdownPercentage = (drawdown / highWaterMark) * 100;
    
    // Add to equity curve
    equityCurve.push({
      timestamp: candle.timestamp,
      equity: capital,
      drawdown,
      drawdownPercentage
    });
  });
  
  return equityCurve;
}

/**
 * Calculate performance metrics from trades and equity curve
 */
function calculatePerformanceMetrics(
  initialCapital: number,
  trades: Trade[],
  equityCurve: EquityPoint[]
): {
  finalCapital: number;
  totalReturn: number;
  totalReturnPercentage: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  largestWin: number;
  largestLoss: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  maxDrawdownPercentage: number;
  sharpeRatio: number;
} {
  // Get final capital from the last equity point
  const finalCapital = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initialCapital;
  
  // Calculate returns
  const totalReturn = finalCapital - initialCapital;
  const totalReturnPercentage = (totalReturn / initialCapital) * 100;
  
  // Calculate trade statistics
  const totalTrades = trades.length;
  const winningTrades = trades.filter(trade => trade.pnl > 0).length;
  const losingTrades = trades.filter(trade => trade.pnl <= 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  
  // Calculate profit statistics
  const winningTradesPnl = trades.filter(trade => trade.pnl > 0).map(trade => trade.pnl);
  const losingTradesPnl = trades.filter(trade => trade.pnl <= 0).map(trade => trade.pnl);
  
  const largestWin = winningTradesPnl.length > 0 ? Math.max(...winningTradesPnl) : 0;
  const largestLoss = losingTradesPnl.length > 0 ? Math.min(...losingTradesPnl) : 0;
  
  const averageWin = winningTradesPnl.length > 0
    ? winningTradesPnl.reduce((sum, pnl) => sum + pnl, 0) / winningTradesPnl.length
    : 0;
  
  const averageLoss = losingTradesPnl.length > 0
    ? losingTradesPnl.reduce((sum, pnl) => sum + pnl, 0) / losingTradesPnl.length
    : 0;
  
  // Find maximum drawdown
  const maxDrawdownPoint = equityCurve.reduce(
    (max, point) => point.drawdown > max.drawdown ? point : max,
    { drawdown: 0, drawdownPercentage: 0 } as EquityPoint
  );
  
  const maxDrawdown = maxDrawdownPoint.drawdown;
  const maxDrawdownPercentage = maxDrawdownPoint.drawdownPercentage;
  
  // Calculate Sharpe ratio (simplified)
  // In a real implementation, we would calculate this properly using daily returns
  const returns = trades.map(trade => trade.pnlPercentage);
  const averageReturn = returns.length > 0
    ? returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    : 0;
  
  const returnVariance = returns.length > 0
    ? returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) / returns.length
    : 0;
  
  const returnStdDev = Math.sqrt(returnVariance);
  const sharpeRatio = returnStdDev > 0 ? averageReturn / returnStdDev : 0;
  
  return {
    finalCapital,
    totalReturn,
    totalReturnPercentage,
    winRate,
    totalTrades,
    winningTrades,
    losingTrades,
    largestWin,
    largestLoss,
    averageWin,
    averageLoss,
    maxDrawdown,
    maxDrawdownPercentage,
    sharpeRatio
  };
}

/**
 * Save backtest result to the database
 */
async function saveBacktestResult(result: BacktestResult): Promise<BacktestResult> {
  const supabase = createBrowserClient();
  
  try {
    // Prepare data for insertion
    const dataToInsert = {
      strategy_id: result.strategyId,
      symbol: result.symbol,
      timeframe: result.timeframe,
      start_date: result.startDate,
      end_date: result.endDate,
      initial_capital: result.initialCapital,
      final_capital: result.finalCapital,
      total_return: result.totalReturn,
      total_return_percentage: result.totalReturnPercentage,
      win_rate: result.winRate,
      total_trades: result.totalTrades,
      winning_trades: result.winningTrades,
      losing_trades: result.losingTrades,
      largest_win: result.largestWin,
      largest_loss: result.largestLoss,
      average_win: result.averageWin,
      average_loss: result.averageLoss,
      max_drawdown: result.maxDrawdown,
      max_drawdown_percentage: result.maxDrawdownPercentage,
      sharpe_ratio: result.sharpeRatio,
      trades: result.trades,
      equity_curve: result.equityCurve,
      strategy_params: result.strategyParams,
      brain_assets: result.brainAssets,
      owner_id: (await supabase.auth.getUser()).data.user?.id
    };
    
    // Save result to database
    const { data, error } = await supabase
      .from('backtest_results')
      .insert(dataToInsert)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving backtest result:', error);
      throw error;
    }
    
    // Link brain assets to strategy
    for (const asset of result.brainAssets) {
      try {
        await linkBrainAssetToStrategy(
          asset.id,
          result.strategyId,
          asset.role,
          { 
            usedInBacktest: true,
            backtestId: data.id
          }
        );
      } catch (linkError) {
        console.error(`Error linking brain asset ${asset.id} to strategy:`, linkError);
      }
    }
    
    // Return result with ID
    return {
      ...result,
      id: data.id
    };
  } catch (error) {
    console.error('Error in saveBacktestResult:', error);
    // Return original result without ID in case of error
    return result;
  }
}

/**
 * Get saved backtest results for a strategy
 */
export async function getBacktestResults(strategyId: number): Promise<BacktestResult[]> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('backtest_results')
      .select('*')
      .eq('strategy_id', strategyId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching backtest results:', error);
      throw error;
    }
    
    // Transform database results to our interface format
    return data.map(item => ({
      id: item.id,
      strategyId: item.strategy_id,
      symbol: item.symbol,
      timeframe: item.timeframe,
      startDate: item.start_date,
      endDate: item.end_date,
      initialCapital: item.initial_capital,
      finalCapital: item.final_capital,
      totalReturn: item.total_return,
      totalReturnPercentage: item.total_return_percentage,
      winRate: item.win_rate,
      totalTrades: item.total_trades,
      winningTrades: item.winning_trades,
      losingTrades: item.losing_trades,
      largestWin: item.largest_win,
      largestLoss: item.largest_loss,
      averageWin: item.average_win,
      averageLoss: item.average_loss,
      maxDrawdown: item.max_drawdown,
      maxDrawdownPercentage: item.max_drawdown_percentage,
      sharpeRatio: item.sharpe_ratio,
      trades: item.trades,
      equityCurve: item.equity_curve,
      strategyParams: item.strategy_params,
      brainAssets: item.brain_assets
    }));
  } catch (error) {
    console.error('Error in getBacktestResults:', error);
    return [];
  }
}

/**
 * Get a specific backtest result
 */
export async function getBacktestResultById(id: number): Promise<BacktestResult | null> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('backtest_results')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching backtest result:', error);
      throw error;
    }
    
    // Transform to our interface format
    return {
      id: data.id,
      strategyId: data.strategy_id,
      symbol: data.symbol,
      timeframe: data.timeframe,
      startDate: data.start_date,
      endDate: data.end_date,
      initialCapital: data.initial_capital,
      finalCapital: data.final_capital,
      totalReturn: data.total_return,
      totalReturnPercentage: data.total_return_percentage,
      winRate: data.win_rate,
      totalTrades: data.total_trades,
      winningTrades: data.winning_trades,
      losingTrades: data.losing_trades,
      largestWin: data.largest_win,
      largestLoss: data.largest_loss,
      averageWin: data.average_win,
      averageLoss: data.average_loss,
      maxDrawdown: data.max_drawdown,
      maxDrawdownPercentage: data.max_drawdown_percentage,
      sharpeRatio: data.sharpe_ratio,
      trades: data.trades,
      equityCurve: data.equity_curve,
      strategyParams: data.strategy_params,
      brainAssets: data.brain_assets
    };
  } catch (error) {
    console.error('Error in getBacktestResultById:', error);
    return null;
  }
}

/**
 * Delete a backtest result
 */
export async function deleteBacktestResult(id: number): Promise<boolean> {
  const supabase = createBrowserClient();
  
  try {
    const { error } = await supabase
      .from('backtest_results')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting backtest result:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteBacktestResult:', error);
    return false;
  }
}
