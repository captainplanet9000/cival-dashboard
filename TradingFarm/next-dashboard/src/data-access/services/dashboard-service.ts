/**
 * Dashboard service to provide aggregated data for the dashboard UI
 */
import { FarmService } from './farm-service';
import { AgentService } from './agent-service';
import { OrderService } from './order-service';
import { TradeService } from './trade-service';
import { Farm } from '../models/farm';
import { Agent } from '../models/agent';
import { Trade } from '../models/trade';
import { Order } from '../models/order';

/**
 * Dashboard summary interface
 */
export interface DashboardSummary {
  totalFarms: number;
  activeFarms: number;
  totalAgents: number;
  activeAgents: number;
  totalValueLocked: number;
  recentTrades: Trade[];
  overallPerformance: {
    win_rate: number;
    profit_factor: number;
    total_trades: number;
    total_profit_loss: number;
  };
  topPerformingAgents: Agent[];
  marketSummary: {
    trending: any[];
    volume: any[];
  };
}

/**
 * Dashboard service to provide aggregated data for dashboards
 */
export class DashboardService {
  private farmService: FarmService;
  private agentService: AgentService;
  private orderService: OrderService;
  private tradeService: TradeService;

  constructor(
    farmService = new FarmService(),
    agentService = new AgentService(),
    orderService = new OrderService(),
    tradeService = new TradeService()
  ) {
    this.farmService = farmService;
    this.agentService = agentService;
    this.orderService = orderService;
    this.tradeService = tradeService;
  }

  /**
   * Get overall dashboard summary
   */
  async getDashboardSummary(userId: number): Promise<DashboardSummary> {
    // Fetch data concurrently
    const [
      allFarms,
      activeFarms,
      allAgents,
      activeAgents,
      totalValueLocked,
      recentTrades
    ] = await Promise.all([
      this.farmService.findAll({ filters: { owner_id: userId } }),
      this.farmService.findActiveFarms(),
      this.agentService.findAll({}),
      this.agentService.findActiveAgents(),
      this.farmService.getTotalValueLocked(),
      this.tradeService.getRecentTrades(10)
    ]);

    // Calculate overall performance metrics
    let winRate = 0;
    let profitFactor = 0;
    let totalTrades = 0;
    let totalProfitLoss = 0;

    const farmIds = allFarms.map((farm: Farm) => farm.id);
    
    // Get all trades for user's farms
    if (farmIds.length > 0) {
      // For a real implementation, we would use more efficient queries
      // This is simplified for demonstration purposes
      let allTradesForUser: Trade[] = [];
      
      for (const farmId of farmIds) {
        const farmTrades = await this.tradeService.findByFarmId(farmId);
        allTradesForUser = [...allTradesForUser, ...farmTrades];
      }
      
      // Calculate metrics
      let wins = 0;
      let losses = 0;
      let totalWins = 0;
      let totalLosses = 0;
      
      allTradesForUser.forEach((trade: Trade) => {
        totalTrades++;
        const pnl = trade.profit_loss || 0;
        totalProfitLoss += pnl;
        
        if (pnl > 0) {
          wins++;
          totalWins += pnl;
        } else if (pnl < 0) {
          losses++;
          totalLosses += Math.abs(pnl);
        }
      });
      
      winRate = totalTrades > 0 ? wins / totalTrades : 0;
      profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
    }

    // Get top performing agents
    const allAgentsArray = Array.isArray(allAgents) ? allAgents : [];
    const topAgents = allAgentsArray
      .filter((agent: Agent) => agent.performance_metrics?.win_rate > 0)
      .sort((a: Agent, b: Agent) => 
        (b.performance_metrics?.profit_factor || 0) - (a.performance_metrics?.profit_factor || 0)
      )
      .slice(0, 5);

    return {
      totalFarms: allFarms.length,
      activeFarms: activeFarms.length,
      totalAgents: allAgentsArray.length,
      activeAgents: activeAgents.length,
      totalValueLocked,
      recentTrades,
      overallPerformance: {
        win_rate: winRate,
        profit_factor: profitFactor,
        total_trades: totalTrades,
        total_profit_loss: totalProfitLoss
      },
      topPerformingAgents: topAgents,
      marketSummary: {
        trending: [],
        volume: []
      }
    };
  }

  /**
   * Get farm dashboard data
   */
  async getFarmDashboard(farmId: number): Promise<any> {
    const [
      farm,
      agents,
      trades,
      openOrders
    ] = await Promise.all([
      this.farmService.getFarmWithRelations(farmId),
      this.agentService.findByFarmId(farmId),
      this.tradeService.findByFarmId(farmId),
      this.orderService.findOpenOrders({ filters: { farm_id: farmId } })
    ]);

    const tradeMetrics = await this.tradeService.calculateTradeMetrics(farmId);
    const orderStats = await this.orderService.getOrderStatistics(farmId);
    const riskProfile = await this.farmService.calculateRiskProfile(farmId);

    return {
      farm,
      agents,
      openOrders,
      tradeMetrics,
      orderStats,
      riskProfile,
      recentTrades: trades
        .sort((a: Trade, b: Trade) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())
        .slice(0, 10)
    };
  }

  /**
   * Get agent dashboard data
   */
  async getAgentDashboard(agentId: number): Promise<any> {
    const [
      agent,
      trades,
      openOrders
    ] = await Promise.all([
      this.agentService.findById(agentId),
      this.tradeService.findByAgentId(agentId),
      this.orderService.findByAgentId(agentId)
    ]);

    if (!agent) {
      return null;
    }

    const farmId = agent.farm_id;
    const farm = await this.farmService.findById(farmId);

    // Calculate agent-specific metrics
    let wins = 0;
    let losses = 0;
    let totalWins = 0;
    let totalLosses = 0;
    
    trades.forEach((trade: Trade) => {
      const pnl = trade.profit_loss || 0;
      
      if (pnl > 0) {
        wins++;
        totalWins += pnl;
      } else if (pnl < 0) {
        losses++;
        totalLosses += Math.abs(pnl);
      }
    });
    
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? wins / totalTrades : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    return {
      agent,
      farm,
      metrics: {
        win_rate: winRate,
        profit_factor: profitFactor,
        total_trades: totalTrades,
        total_wins: wins,
        total_losses: losses,
        total_profit: totalWins,
        total_loss: totalLosses
      },
      openOrders,
      recentTrades: trades
        .sort((a: Trade, b: Trade) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())
        .slice(0, 10)
    };
  }
} 