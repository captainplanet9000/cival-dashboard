import { createServerClient } from '@/utils/supabase/server';
import { fetchMarketData, MarketDataOptions, Candle } from './market-data';
import { loadStrategyConfiguration, executeStrategy } from './strategy-engine';

export interface BacktestParams {
  strategyId: number;
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  feePercentage: number;
  params?: Record<string, any>;
}

export interface BacktestTrade {
  entryTime: string;
  entryPrice: number;
  exitTime?: string;
  exitPrice?: number;
  side: 'long' | 'short';
  quantity: number;
  pnl?: number;
  pnlPercentage?: number;
  fees: number;
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
  trades: BacktestTrade[];
  equityCurve: Array<{ time: string; equity: number }>;
  strategyParams: Record<string, any>;
  brainAssets?: Array<{
    id: number;
    role: string;
    title: string;
  }>
}

/**
 * Run a backtest for a strategy
 */
export async function runBacktest(params: BacktestParams): Promise<BacktestResult> {
  try {
    const supabase = createServerClient();
    
    // Load the strategy configuration including brain assets
    const strategyConfig = await loadStrategyConfiguration(params.strategyId);
    
    // Fetch historical market data
    const marketDataOptions: MarketDataOptions = {
      symbol: params.symbol,
      timeframe: params.timeframe,
      startTime: params.startDate,
      endTime: params.endDate
    };
    
    const candles = await fetchMarketData(marketDataOptions);
    
    // Run the backtest
    const result = await runBacktestSimulation(
      params.strategyId,
      candles,
      params.initialCapital,
      params.feePercentage,
      params.params || {},
      strategyConfig
    );
    
    // Save the backtest result
    const { data, error } = await supabase
      .from('backtest_results')
      .insert({
        strategy_id: params.strategyId,
        symbol: params.symbol,
        timeframe: params.timeframe,
        start_date: params.startDate,
        end_date: params.endDate,
        initial_capital: params.initialCapital,
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
        strategy_params: params.params || {},
        brain_assets: Object.entries(strategyConfig.assets).flatMap(([role, assets]) => 
          assets.map((asset: any) => ({
            id: asset.id,
            role,
            title: asset.title
          }))
        )
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving backtest result:', error);
    } else if (data) {
      result.id = data.id;
    }
    
    return result;
    
  } catch (error) {
    console.error('Backtest error:', error);
    throw error;
  }
}

/**
 * Run the backtest simulation
 */
async function runBacktestSimulation(
  strategyId: number,
  candles: Candle[],
  initialCapital: number,
  feePercentage: number,
  params: Record<string, any>,
  strategyConfig: any
): Promise<BacktestResult> {
  // Initialize variables
  let capital = initialCapital;
  let position: { side: 'long' | 'short'; entryPrice: number; entryTime: string; quantity: number } | null = null;
  const trades: BacktestTrade[] = [];
  const equityCurve: Array<{ time: string; equity: number }> = [{ time: candles[0].timestamp, equity: initialCapital }];
  
  let highWaterMark = initialCapital;
  let maxDrawdown = 0;
  
  // Performance metrics
  let winningTrades = 0;
  let losingTrades = 0;
  let breakEvenTrades = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let totalWinAmount = 0;
  let totalLossAmount = 0;
  
  // For each candle
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    
    // Skip some candles at the beginning for indicators to initialize
    if (i < 10) continue;
    
    // Get subset of candles up to current point for the strategy
    const candlesUpToNow = candles.slice(0, i + 1);
    
    // Execute strategy
    const executionContext = {
      strategyId,
      market: params.symbol,
      timeframe: params.timeframe,
      params
    };
    
    const strategyResult = await executeStrategy(executionContext);
    
    if (!strategyResult.success) {
      console.error('Strategy execution error during backtest:', strategyResult.error);
      continue;
    }
    
    // Get the signal for the current candle
    const currentSignal = strategyResult.signals.find(s => s.time === candle.timestamp);
    
    // Process the signal
    if (currentSignal) {
      // If we have a position and get an exit signal
      if (position && 
          ((position.side === 'long' && currentSignal.type === 'sell') ||
           (position.side === 'short' && currentSignal.type === 'buy'))) {
        
        // Calculate P&L
        const exitPrice = candle.close;
        let pnl = 0;
        
        if (position.side === 'long') {
          pnl = (exitPrice - position.entryPrice) * position.quantity;
        } else {
          pnl = (position.entryPrice - exitPrice) * position.quantity;
        }
        
        // Calculate fees
        const entryFee = position.entryPrice * position.quantity * (feePercentage / 100);
        const exitFee = exitPrice * position.quantity * (feePercentage / 100);
        const totalFees = entryFee + exitFee;
        
        // Calculate net P&L
        const netPnl = pnl - totalFees;
        const pnlPercentage = (netPnl / (position.entryPrice * position.quantity)) * 100;
        
        // Update capital
        capital += netPnl;
        
        // Record the trade
        const trade: BacktestTrade = {
          entryTime: position.entryTime,
          entryPrice: position.entryPrice,
          exitTime: candle.timestamp,
          exitPrice,
          side: position.side,
          quantity: position.quantity,
          pnl: netPnl,
          pnlPercentage,
          fees: totalFees
        };
        
        trades.push(trade);
        
        // Update performance metrics
        if (netPnl > 0) {
          winningTrades++;
          totalWinAmount += netPnl;
          largestWin = Math.max(largestWin, netPnl);
        } else if (netPnl < 0) {
          losingTrades++;
          totalLossAmount += Math.abs(netPnl);
          largestLoss = Math.max(largestLoss, Math.abs(netPnl));
        } else {
          breakEvenTrades++;
        }
        
        // Reset position
        position = null;
      }
      
      // If we don't have a position and get an entry signal
      else if (!position && 
              (currentSignal.type === 'buy' || currentSignal.type === 'sell')) {
        
        // Calculate position size (simplified)
        const positionSize = capital * 0.1; // Use 10% of capital per trade
        const entryPrice = candle.close;
        const quantity = positionSize / entryPrice;
        
        // Open a new position
        position = {
          side: currentSignal.type === 'buy' ? 'long' : 'short',
          entryPrice,
          entryTime: candle.timestamp,
          quantity
        };
      }
    }
    
    // Update equity curve
    equityCurve.push({ time: candle.timestamp, equity: capital });
    
    // Update drawdown
    if (capital > highWaterMark) {
      highWaterMark = capital;
    } else {
      const drawdown = highWaterMark - capital;
      const drawdownPercentage = (drawdown / highWaterMark) * 100;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }
  
  // Close any open position at the end
  if (position) {
    const lastCandle = candles[candles.length - 1];
    const exitPrice = lastCandle.close;
    let pnl = 0;
    
    if (position.side === 'long') {
      pnl = (exitPrice - position.entryPrice) * position.quantity;
    } else {
      pnl = (position.entryPrice - exitPrice) * position.quantity;
    }
    
    // Calculate fees
    const entryFee = position.entryPrice * position.quantity * (feePercentage / 100);
    const exitFee = exitPrice * position.quantity * (feePercentage / 100);
    const totalFees = entryFee + exitFee;
    
    // Calculate net P&L
    const netPnl = pnl - totalFees;
    const pnlPercentage = (netPnl / (position.entryPrice * position.quantity)) * 100;
    
    // Update capital
    capital += netPnl;
    
    // Record the trade
    const trade: BacktestTrade = {
      entryTime: position.entryTime,
      entryPrice: position.entryPrice,
      exitTime: lastCandle.timestamp,
      exitPrice,
      side: position.side,
      quantity: position.quantity,
      pnl: netPnl,
      pnlPercentage,
      fees: totalFees
    };
    
    trades.push(trade);
    
    // Update performance metrics
    if (netPnl > 0) {
      winningTrades++;
      totalWinAmount += netPnl;
      largestWin = Math.max(largestWin, netPnl);
    } else if (netPnl < 0) {
      losingTrades++;
      totalLossAmount += Math.abs(netPnl);
      largestLoss = Math.max(largestLoss, Math.abs(netPnl));
    } else {
      breakEvenTrades++;
    }
    
    // Final equity curve update
    equityCurve.push({ time: lastCandle.timestamp, equity: capital });
  }
  
  // Calculate final metrics
  const totalTrades = winningTrades + losingTrades + breakEvenTrades;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalReturn = capital - initialCapital;
  const totalReturnPercentage = (totalReturn / initialCapital) * 100;
  const averageWin = winningTrades > 0 ? totalWinAmount / winningTrades : 0;
  const averageLoss = losingTrades > 0 ? totalLossAmount / losingTrades : 0;
  const maxDrawdownPercentage = (maxDrawdown / highWaterMark) * 100;
  
  // Calculate Sharpe Ratio (simplified)
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const dailyReturn = (equityCurve[i].equity - equityCurve[i-1].equity) / equityCurve[i-1].equity;
    dailyReturns.push(dailyReturn);
  }
  
  const averageReturn = dailyReturns.reduce((sum, val) => sum + val, 0) / dailyReturns.length;
  const standardDeviation = Math.sqrt(
    dailyReturns.reduce((sum, val) => sum + Math.pow(val - averageReturn, 2), 0) / dailyReturns.length
  );
  
  const sharpeRatio = standardDeviation !== 0 ? (averageReturn / standardDeviation) * Math.sqrt(252) : 0;
  
  return {
    strategyId,
    symbol: params.symbol,
    timeframe: params.timeframe,
    startDate: candles[0].timestamp,
    endDate: candles[candles.length - 1].timestamp,
    initialCapital,
    finalCapital: capital,
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
    sharpeRatio,
    trades,
    equityCurve,
    strategyParams: params,
    brainAssets: Object.entries(strategyConfig.assets).flatMap(([role, assets]) => 
      assets.map((asset: any) => ({
        id: asset.id,
        role,
        title: asset.title
      }))
    )
  };
}

/**
 * Get a backtest result by ID
 */
export async function getBacktestResult(id: number): Promise<BacktestResult | null> {
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('backtest_results')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Convert database fields to camelCase interface
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
    console.error('Error getting backtest result:', error);
    return null;
  }
}
