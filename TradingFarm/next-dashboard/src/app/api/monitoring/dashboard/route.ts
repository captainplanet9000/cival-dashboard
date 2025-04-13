import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { SystemMonitor } from '@/services/monitoring/system-monitor';
import { LoggingService, LogLevel, LogCategory } from '@/services/monitoring/logging-service';

/**
 * Get monitoring dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const logger = await LoggingService.getInstance();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const timeframe = searchParams.get('timeframe') || '24h';
    
    // Calculate time range based on timeframe
    const endTime = new Date();
    let startTime = new Date();
    
    switch (timeframe) {
      case '1h':
        startTime.setHours(endTime.getHours() - 1);
        break;
      case '6h':
        startTime.setHours(endTime.getHours() - 6);
        break;
      case '24h':
        startTime.setHours(endTime.getHours() - 24);
        break;
      case '7d':
        startTime.setDate(endTime.getDate() - 7);
        break;
      case '30d':
        startTime.setDate(endTime.getDate() - 30);
        break;
      default:
        startTime.setHours(endTime.getHours() - 24);
    }
    
    // Log dashboard request
    await logger.info(
      `Monitoring dashboard requested with timeframe ${timeframe}`,
      LogCategory.SYSTEM,
      { startTime, endTime }
    );
    
    // Create system monitor
    const systemMonitor = await SystemMonitor.create();
    
    // Get system metrics
    const metrics = await systemMonitor.getMetricsForRange(startTime, endTime);
    
    // Get service statuses
    const serviceStatuses = await systemMonitor.getAllServiceStatuses();
    
    // Get active trading agents
    const { data: activeAgents, error: agentsError } = await supabase
      .from('elizaos_agents')
      .select('id, name, agent_type, status, updated_at')
      .in('status', ['active', 'running'])
      .order('updated_at', { ascending: false });
      
    if (agentsError) {
      await logger.error(
        'Error fetching active agents for dashboard',
        LogCategory.SYSTEM,
        { error: agentsError }
      );
    }
    
    // Get recent trading activity
    const { data: recentTrades, error: tradesError } = await supabase
      .from('trading_agent_trades')
      .select(`
        id, 
        agent_id, 
        symbol, 
        side, 
        price, 
        quantity, 
        profit_loss,
        created_at,
        agents:elizaos_agents(name)
      `)
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (tradesError) {
      await logger.error(
        'Error fetching recent trades for dashboard',
        LogCategory.SYSTEM,
        { error: tradesError }
      );
    }
    
    // Get recent alerts
    const { data: recentAlerts, error: alertsError } = await supabase
      .from('trading_alerts')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (alertsError) {
      await logger.error(
        'Error fetching recent alerts for dashboard',
        LogCategory.SYSTEM,
        { error: alertsError }
      );
    }
    
    // Get system logs
    const { logs: recentLogs } = await logger.getLogs({
      startTime,
      endTime,
      levels: [LogLevel.ERROR, LogLevel.CRITICAL],
      limit: 50
    });
    
    // Get performance statistics
    const performanceStats = await getPerformanceStats(supabase, startTime);
    
    // Return dashboard data
    return NextResponse.json({
      metrics,
      serviceStatuses,
      activeAgents: activeAgents || [],
      recentTrades: recentTrades || [],
      recentAlerts: recentAlerts || [],
      recentLogs,
      performanceStats,
      timeframe,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    });
  } catch (error: any) {
    console.error('Error getting monitoring dashboard:', error);
    
    // Return error response
    return NextResponse.json(
      { error: 'Error getting monitoring dashboard', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get performance statistics
 */
async function getPerformanceStats(supabase: any, startTime: Date): Promise<any> {
  try {
    // Get trading volume
    const { data: volumeData } = await supabase
      .from('trading_agent_trades')
      .select('quantity, price')
      .gte('created_at', startTime.toISOString());
      
    const tradingVolume = volumeData
      ? volumeData.reduce((sum: number, trade: any) => sum + (trade.quantity * trade.price), 0)
      : 0;
    
    // Get profit/loss
    const { data: profitData } = await supabase
      .from('trading_agent_trades')
      .select('profit_loss')
      .gte('created_at', startTime.toISOString());
      
    const totalProfitLoss = profitData
      ? profitData.reduce((sum: number, trade: any) => sum + (trade.profit_loss || 0), 0)
      : 0;
    
    // Get trade count
    const { count: tradeCount } = await supabase
      .from('trading_agent_trades')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startTime.toISOString());
    
    // Get winning trades
    const { count: winningTradeCount } = await supabase
      .from('trading_agent_trades')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startTime.toISOString())
      .gt('profit_loss', 0);
    
    // Calculate win rate
    const winRate = tradeCount ? (winningTradeCount / tradeCount) * 100 : 0;
    
    // Get agent performance
    const { data: agentPerformance } = await supabase
      .from('trading_agent_trades')
      .select(`
        agents:elizaos_agents(id, name),
        agent_id,
        profit_loss
      `)
      .gte('created_at', startTime.toISOString());
    
    // Group by agent and calculate total profit/loss
    const agentStats: Record<string, { name: string; profit_loss: number; trade_count: number }> = {};
    
    if (agentPerformance) {
      for (const trade of agentPerformance) {
        const agentId = trade.agent_id;
        const agentName = trade.agents?.name || 'Unknown Agent';
        const profitLoss = trade.profit_loss || 0;
        
        if (!agentStats[agentId]) {
          agentStats[agentId] = {
            name: agentName,
            profit_loss: 0,
            trade_count: 0
          };
        }
        
        agentStats[agentId].profit_loss += profitLoss;
        agentStats[agentId].trade_count += 1;
      }
    }
    
    // Convert to array and sort by profit/loss
    const topAgents = Object.entries(agentStats)
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        profit_loss: stats.profit_loss,
        trade_count: stats.trade_count
      }))
      .sort((a, b) => b.profit_loss - a.profit_loss)
      .slice(0, 5);
    
    // Return performance statistics
    return {
      tradingVolume,
      totalProfitLoss,
      tradeCount: tradeCount || 0,
      winRate,
      topAgents
    };
  } catch (error) {
    console.error('Error getting performance statistics:', error);
    return {
      tradingVolume: 0,
      totalProfitLoss: 0,
      tradeCount: 0,
      winRate: 0,
      topAgents: []
    };
  }
}
