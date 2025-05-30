import { BaseService } from './base-service';
import { TradeRepository } from '../repositories/trade-repository';
import { Trade } from '../models/trade';

/**
 * Service for managing Trade entities
 */
export class TradeService extends BaseService<Trade> {
  private tradeRepository: TradeRepository;

  constructor(tradeRepository = new TradeRepository()) {
    super(tradeRepository);
    this.tradeRepository = tradeRepository;
  }

  /**
   * Find trades by farm ID
   */
  async findByFarmId(farmId: number): Promise<Trade[]> {
    return this.tradeRepository.findAll({
      filters: { farm_id: farmId }
    });
  }

  /**
   * Find trades by agent ID
   */
  async findByAgentId(agentId: number): Promise<Trade[]> {
    return this.tradeRepository.findAll({
      filters: { agent_id: agentId }
    });
  }

  /**
   * Find trades by order ID
   */
  async findByOrderId(orderId: number): Promise<Trade[]> {
    return this.tradeRepository.findAll({
      filters: { order_id: orderId }
    });
  }

  /**
   * Find trades for a specific symbol
   */
  async findBySymbol(symbol: string): Promise<Trade[]> {
    return this.tradeRepository.findAll({
      filters: { symbol }
    });
  }

  /**
   * Calculate profit/loss for a set of trades
   */
  async calculatePnL(trades: Trade[]): Promise<{
    total: number;
    realized: number;
    unrealized: number;
  }> {
    let total = 0;
    let realized = 0;
    
    trades.forEach(trade => {
      const pnl = trade.profit_loss || 0;
      total += pnl;
      
      // Consider a trade realized if it has a profit_loss value
      if (trade.profit_loss !== undefined) {
        realized += pnl;
      }
    });
    
    return {
      total,
      realized,
      unrealized: total - realized
    };
  }

  /**
   * Get recent trades with pagination
   */
  async getRecentTrades(limit = 10, offset = 0): Promise<Trade[]> {
    return this.tradeRepository.findAll({
      limit,
      offset,
      orderBy: 'executed_at',
      orderDirection: 'desc'
    });
  }

  /**
   * Calculate trade metrics for a farm
   */
  async calculateTradeMetrics(farmId: number): Promise<{
    win_rate: number;
    profit_factor: number;
    average_win: number;
    average_loss: number;
    largest_win: number;
    largest_loss: number;
    total_trades: number;
  }> {
    const trades = await this.findByFarmId(farmId);
    
    // Calculate metrics
    let wins = 0;
    let losses = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let largestWin = 0;
    let largestLoss = 0;
    
    trades.forEach(trade => {
      const pnl = trade.profit_loss || 0;
      
      if (pnl > 0) {
        wins++;
        totalWins += pnl;
        largestWin = Math.max(largestWin, pnl);
      } else if (pnl < 0) {
        losses++;
        totalLosses += Math.abs(pnl);
        largestLoss = Math.max(largestLoss, Math.abs(pnl));
      }
    });
    
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
    const averageWin = wins > 0 ? totalWins / wins : 0;
    const averageLoss = losses > 0 ? totalLosses / losses : 0;
    
    return {
      win_rate: winRate,
      profit_factor: profitFactor,
      average_win: averageWin,
      average_loss: averageLoss,
      largest_win: largestWin,
      largest_loss: largestLoss,
      total_trades: totalTrades
    };
  }
} 