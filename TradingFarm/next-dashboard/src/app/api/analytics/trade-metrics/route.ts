import { NextResponse } from 'next/server';
import { tradeService } from '../../../../data-access/services';
import { Trade } from '../../../../data-access/models/trade';

/**
 * GET /api/analytics/trade-metrics
 * Returns trade metrics for a farm, agent, or symbol
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const agentId = searchParams.get('agentId');
    const symbol = searchParams.get('symbol');
    
    if (!farmId && !agentId && !symbol) {
      return NextResponse.json(
        { error: 'At least one of farmId, agentId, or symbol is required' },
        { status: 400 }
      );
    }
    
    // Get trades based on filters
    let trades: Trade[] = [];
    
    if (farmId) {
      // If farmId is provided, use calculateTradeMetrics from tradeService
      const metrics = await tradeService.calculateTradeMetrics(Number(farmId));
      return NextResponse.json({ data: metrics });
    } else if (agentId) {
      trades = await tradeService.findByAgentId(Number(agentId));
    } else if (symbol) {
      trades = await tradeService.findBySymbol(symbol);
    }
    
    // Calculate P&L for the trades
    const pnl = await tradeService.calculatePnL(trades);
    
    // Calculate basic metrics
    let wins = 0;
    let losses = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let largestWin = 0;
    let largestLoss = 0;
    
    trades.forEach((trade: Trade) => {
      const profitLoss = trade.profit_loss || 0;
      
      if (profitLoss > 0) {
        wins++;
        totalWins += profitLoss;
        largestWin = Math.max(largestWin, profitLoss);
      } else if (profitLoss < 0) {
        losses++;
        totalLosses += Math.abs(profitLoss);
        largestLoss = Math.max(largestLoss, Math.abs(profitLoss));
      }
    });
    
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
    const averageWin = wins > 0 ? totalWins / wins : 0;
    const averageLoss = losses > 0 ? totalLosses / losses : 0;
    
    return NextResponse.json({
      data: {
        pnl,
        metrics: {
          win_rate: winRate,
          profit_factor: profitFactor,
          average_win: averageWin,
          average_loss: averageLoss,
          largest_win: largestWin,
          largest_loss: largestLoss,
          total_trades: totalTrades,
          total_wins: wins,
          total_losses: losses
        }
      }
    });
  } catch (error) {
    console.error('Error calculating trade metrics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate trade metrics' },
      { status: 500 }
    );
  }
} 