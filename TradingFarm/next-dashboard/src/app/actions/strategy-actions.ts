'use server';

import { createServerClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Create a new strategy
 */
export async function createStrategy(strategyData: {
  name: string;
  description: string;
  type: string;
  version: string;
  parameters: any;
  is_active: boolean;
  performance_metrics: any;
  content: string;
}) {
  try {
    const supabase = await createServerClient();
    
    // Insert strategy into database
    const { data: strategy, error } = await supabase
      .from('strategies')
      .insert({
        name: strategyData.name,
        description: strategyData.description,
        type: strategyData.type,
        version: strategyData.version,
        parameters: strategyData.parameters,
        is_active: strategyData.is_active,
        performance_metrics: strategyData.performance_metrics,
        content: strategyData.content
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating strategy:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/strategies');
    
    return { success: true, data: strategy };
  } catch (error) {
    console.error('Error creating strategy:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update an existing strategy
 */
export async function updateStrategy(
  id: string,
  strategyData: Partial<{
    name: string;
    description: string;
    type: string;
    version: string;
    parameters: any;
    is_active: boolean;
    performance_metrics: any;
    content: string;
  }>
) {
  try {
    const supabase = await createServerClient();
    
    // Update strategy in database
    const { error } = await supabase
      .from('strategies')
      .update({
        ...strategyData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating strategy:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/strategies');
    
    return { success: true };
  } catch (error) {
    console.error('Error updating strategy:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a strategy
 */
export async function deleteStrategy(id: string) {
  try {
    const supabase = await createServerClient();
    
    // Delete strategy from database
    const { error } = await supabase
      .from('strategies')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting strategy:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/strategies');
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting strategy:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Toggle strategy active status
 */
export async function toggleStrategyActive(id: string, isActive: boolean) {
  try {
    const supabase = await createServerClient();
    
    // Update strategy in database
    const { error } = await supabase
      .from('strategies')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error toggling strategy active state:', error);
      return { success: false, error: error.message };
    }
    
    revalidatePath('/strategies');
    
    return { success: true };
  } catch (error) {
    console.error('Error toggling strategy active state:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Run a backtest on a strategy
 */
export async function backtest(params: {
  strategyName: string;
  symbol: string;
  timeframe: string;
  initialCapital: number;
  startDate: string;
  endDate: string;
  strategy: string;
}) {
  try {
    // In a real implementation, this would call a backend API to run the backtest
    // For now, we'll simulate a backtest with realistic looking data
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate fake backtest results
    const days = Math.round((new Date(params.endDate).getTime() - new Date(params.startDate).getTime()) / (1000 * 60 * 60 * 24));
    const totalTrades = Math.floor(days / 3); // Approximately one trade every 3 days
    const winRate = 0.55 + (Math.random() * 0.2); // Between 55% and 75%
    const profitFactor = 1.5 + (Math.random() * 1); // Between 1.5 and 2.5
    
    // Calculate final capital with some randomness
    const returnMultiplier = (Math.random() * 0.5) + (winRate > 0.6 ? 0.3 : 0.1); // Better win rate leads to better returns
    const finalCapital = params.initialCapital * (1 + returnMultiplier);
    
    // Generate equity curve
    const equityCurve = [];
    let currentDate = new Date(params.startDate);
    let currentEquity = params.initialCapital;
    const endDate = new Date(params.endDate);
    const dailyReturnMean = returnMultiplier / days;
    const dailyReturnStd = 0.02; // Daily volatility
    
    while (currentDate <= endDate) {
      // Random walk with drift for equity curve
      const dailyReturn = (Math.random() * 2 - 1) * dailyReturnStd + dailyReturnMean;
      currentEquity = currentEquity * (1 + dailyReturn);
      
      equityCurve.push({
        date: currentDate.toISOString().split('T')[0],
        equity: currentEquity
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Generate fake trades
    const trades = [];
    currentDate = new Date(params.startDate);
    let tradeId = 1;
    
    for (let i = 0; i < totalTrades; i++) {
      // Random date within range
      const daysOffset = Math.floor(Math.random() * days);
      const tradeDate = new Date(params.startDate);
      tradeDate.setDate(tradeDate.getDate() + daysOffset);
      
      // Ensure trade date is within range
      if (tradeDate > endDate) continue;
      
      // Random price for the symbol
      const basePrice = params.symbol.includes('BTC') ? 30000 : params.symbol.includes('ETH') ? 2000 : 100;
      const price = basePrice * (0.8 + Math.random() * 0.4); // 80% to 120% of base price
      
      // Random quantity
      const quantity = params.initialCapital / basePrice * (0.1 + Math.random() * 0.2); // 10-30% of initial capital
      
      // Random PnL between -10% and +20% of trade value
      const isWin = Math.random() < winRate;
      const pnlPct = isWin ? (Math.random() * 0.2) : -(Math.random() * 0.1);
      const pnl = price * quantity * pnlPct;
      
      trades.push({
        id: tradeId++,
        date: tradeDate.toISOString(),
        type: i % 2 === 0 ? 'buy' : 'sell',
        price,
        quantity,
        pnl
      });
    }
    
    // Sort trades by date
    trades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate max drawdown
    let maxEquity = params.initialCapital;
    let maxDrawdown = 0;
    
    for (const point of equityCurve) {
      if (point.equity > maxEquity) {
        maxEquity = point.equity;
      } else {
        const drawdown = (maxEquity - point.equity) / maxEquity * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }
    
    // Create backtest result
    const backtestResult = {
      equityCurve,
      performance: {
        initialCapital: params.initialCapital,
        finalCapital: finalCapital,
        totalReturn: ((finalCapital - params.initialCapital) / params.initialCapital) * 100,
        maxDrawdown,
        winRate: winRate * 100,
        sharpeRatio: (returnMultiplier / dailyReturnStd) * Math.sqrt(252), // Annualized Sharpe ratio
        profitFactor,
        totalTrades: trades.length
      },
      trades
    };
    
    // Save backtest result to database
    const supabase = await createServerClient();
    
    // Generate a unique strategy ID if this is a new strategy
    const strategyContent = JSON.parse(params.strategy);
    const uniqueId = `${params.strategyName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
    
    const { data: savedBacktest, error } = await supabase
      .from('backtest_results')
      .insert({
        strategy_id: uniqueId,
        symbol: params.symbol,
        timeframe: params.timeframe,
        start_date: params.startDate,
        end_date: params.endDate,
        initial_capital: params.initialCapital,
        final_capital: finalCapital,
        max_drawdown: maxDrawdown,
        win_rate: winRate * 100,
        profit_factor: profitFactor,
        total_trades: trades.length,
        sharpe_ratio: (returnMultiplier / dailyReturnStd) * Math.sqrt(252),
        results: {
          equity_curve: equityCurve,
          trades,
          strategy_content: strategyContent
        }
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error saving backtest results:', error);
      // Continue anyway, the frontend still got the results
    }
    
    return { success: true, data: backtestResult };
  } catch (error) {
    console.error('Error running backtest:', error);
    return { success: false, error: 'An unexpected error occurred during backtesting' };
  }
}

/**
 * Deploy a strategy to live trading
 */
export async function deployStrategy(id: string, farmId: string, deploymentOptions: {
  capital_allocation: number;
  risk_profile_id?: string;
  auto_start?: boolean;
  max_concurrent_trades?: number;
  trading_hours?: {
    start: string;
    end: string;
    timezone: string;
  };
}) {
  try {
    const supabase = await createServerClient();
    
    // Get strategy details
    const { data: strategy, error: strategyError } = await supabase
      .from('strategies')
      .select('*')
      .eq('id', id)
      .single();
    
    if (strategyError) {
      console.error('Error fetching strategy:', strategyError);
      return { success: false, error: strategyError.message };
    }
    
    // Create agent from strategy
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        farm_id: farmId,
        name: `${strategy.name} Agent`,
        description: `Deployed from ${strategy.name} (v${strategy.version})`,
        strategy_id: id,
        capital_allocation: deploymentOptions.capital_allocation,
        risk_profile_id: deploymentOptions.risk_profile_id,
        is_active: deploymentOptions.auto_start || false,
        parameters: {
          ...strategy.parameters,
          max_concurrent_trades: deploymentOptions.max_concurrent_trades || 1,
          trading_hours: deploymentOptions.trading_hours
        }
      })
      .select('id')
      .single();
    
    if (agentError) {
      console.error('Error creating agent:', agentError);
      return { success: false, error: agentError.message };
    }
    
    // Update strategy to mark as deployed
    await supabase
      .from('strategies')
      .update({
        is_deployed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    revalidatePath('/strategies');
    revalidatePath('/agents');
    
    return { success: true, data: agent };
  } catch (error) {
    console.error('Error deploying strategy:', error);
    return { success: false, error: 'An unexpected error occurred during deployment' };
  }
}
