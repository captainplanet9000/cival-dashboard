/**
 * Mock Performance Metrics
 * Provides simulated performance data for farms, agents, and strategies
 */

// Mock daily farm performance
export const mockFarmPerformance = [
  // Farm 1 Performance (90 days of performance data)
  ...Array.from({ length: 90 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (89 - i));
    
    // Generate a somewhat realistic equity curve with some volatility
    const daysSince = i;
    const trendComponent = daysSince * 0.15; // Gradual uptrend
    const volatilityComponent = Math.sin(daysSince * 0.2) * 5; // Add some cyclicality
    const randomComponent = (Math.random() - 0.5) * 6; // Add some randomness
    
    const dailyChangePercent = (trendComponent + volatilityComponent + randomComponent) / 100;
    const startingEquity = 100000;
    const equity = startingEquity * (1 + (daysSince * 0.004 + dailyChangePercent));
    
    return {
      farm_id: 'farm-1',
      date: date.toISOString().split('T')[0],
      equity: Math.round(equity),
      daily_pnl: Math.round(equity * dailyChangePercent),
      daily_pnl_percent: parseFloat((dailyChangePercent * 100).toFixed(2)),
      trades_count: Math.floor(Math.random() * 15) + 5,
      win_rate: parseFloat((Math.random() * 25 + 50).toFixed(2)),
      largest_win: Math.round((Math.random() * 2 + 1) * 1000),
      largest_loss: -Math.round((Math.random() * 1.5 + 0.5) * 1000),
      sharpe_ratio: parseFloat((Math.random() * 0.5 + 1.8).toFixed(2)),
      max_drawdown: parseFloat(-(Math.random() * 3 + 2).toFixed(2)),
      volatility: parseFloat((Math.random() * 2 + 10).toFixed(2)),
    };
  }),
  
  // Farm 2 Performance (90 days of performance data)
  ...Array.from({ length: 90 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (89 - i));
    
    // Different pattern for farm 2 - more volatile with stronger returns
    const daysSince = i;
    const trendComponent = daysSince * 0.2; // Steeper uptrend
    const volatilityComponent = Math.sin(daysSince * 0.3) * 8; // More cyclicality
    const randomComponent = (Math.random() - 0.5) * 10; // More randomness
    
    const dailyChangePercent = (trendComponent + volatilityComponent + randomComponent) / 100;
    const startingEquity = 250000;
    const equity = startingEquity * (1 + (daysSince * 0.006 + dailyChangePercent));
    
    return {
      farm_id: 'farm-2',
      date: date.toISOString().split('T')[0],
      equity: Math.round(equity),
      daily_pnl: Math.round(equity * dailyChangePercent),
      daily_pnl_percent: parseFloat((dailyChangePercent * 100).toFixed(2)),
      trades_count: Math.floor(Math.random() * 25) + 10,
      win_rate: parseFloat((Math.random() * 20 + 55).toFixed(2)),
      largest_win: Math.round((Math.random() * 3 + 2) * 1000),
      largest_loss: -Math.round((Math.random() * 2 + 1) * 1000),
      sharpe_ratio: parseFloat((Math.random() * 0.8 + 2.2).toFixed(2)),
      max_drawdown: parseFloat(-(Math.random() * 4 + 3).toFixed(2)),
      volatility: parseFloat((Math.random() * 3 + 12).toFixed(2)),
    };
  })
];

// Mock agent performance data
export const mockAgentPerformance = [
  // Generate 90 days of performance data for each agent
  
  // Agent 1 (TrendBot) - Standard agent with trend following strategy
  ...Array.from({ length: 90 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (89 - i));
    
    const daysSince = i;
    const trendComponent = daysSince * 0.12;
    const volatilityComponent = Math.sin(daysSince * 0.25) * 4;
    const randomComponent = (Math.random() - 0.5) * 5;
    
    const dailyChangePercent = (trendComponent + volatilityComponent + randomComponent) / 100;
    const startingEquity = 25000;
    const equity = startingEquity * (1 + (daysSince * 0.003 + dailyChangePercent));
    
    return {
      agent_id: 'agent-1',
      date: date.toISOString().split('T')[0],
      equity: Math.round(equity),
      daily_pnl: Math.round(equity * dailyChangePercent),
      daily_pnl_percent: parseFloat((dailyChangePercent * 100).toFixed(2)),
      trades_count: Math.floor(Math.random() * 5) + 1,
      win_rate: parseFloat((Math.random() * 20 + 50).toFixed(2)),
      markets_traded: ['BTC-USD', 'ETH-USD'],
      strategy_allocation: { trend: 100 }
    };
  }),
  
  // Agent 2 (ArbitrageBot) - Standard agent with arbitrage strategy
  ...Array.from({ length: 90 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (89 - i));
    
    const daysSince = i;
    const trendComponent = daysSince * 0.08;
    const volatilityComponent = Math.sin(daysSince * 0.15) * 2; // Less volatility for arbitrage
    const randomComponent = (Math.random() - 0.5) * 3;
    
    const dailyChangePercent = (trendComponent + volatilityComponent + randomComponent) / 100;
    const startingEquity = 30000;
    const equity = startingEquity * (1 + (daysSince * 0.002 + dailyChangePercent));
    
    return {
      agent_id: 'agent-2',
      date: date.toISOString().split('T')[0],
      equity: Math.round(equity),
      daily_pnl: Math.round(equity * dailyChangePercent),
      daily_pnl_percent: parseFloat((dailyChangePercent * 100).toFixed(2)),
      trades_count: Math.floor(Math.random() * 15) + 5, // More trades for arbitrage
      win_rate: parseFloat((Math.random() * 10 + 70).toFixed(2)), // Higher win rate, lower returns
      markets_traded: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
      strategy_allocation: { arbitrage: 100 }
    };
  }),
  
  // Agent 3 (MomentumMaster) - Standard agent with momentum strategy
  ...Array.from({ length: 90 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (89 - i));
    
    const daysSince = i;
    const trendComponent = daysSince * 0.15;
    const volatilityComponent = Math.sin(daysSince * 0.3) * 7; // Higher volatility for momentum
    const randomComponent = (Math.random() - 0.5) * 8;
    
    const dailyChangePercent = (trendComponent + volatilityComponent + randomComponent) / 100;
    const startingEquity = 45000;
    const equity = startingEquity * (1 + (daysSince * 0.004 + dailyChangePercent));
    
    return {
      agent_id: 'agent-3',
      date: date.toISOString().split('T')[0],
      equity: Math.round(equity),
      daily_pnl: Math.round(equity * dailyChangePercent),
      daily_pnl_percent: parseFloat((dailyChangePercent * 100).toFixed(2)),
      trades_count: Math.floor(Math.random() * 8) + 2,
      win_rate: parseFloat((Math.random() * 25 + 45).toFixed(2)),
      markets_traded: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD'],
      strategy_allocation: { momentum: 100 }
    };
  }),
  
  // Agent 4 (ElizaStrategist) - ElizaOS agent with mixed strategy
  ...Array.from({ length: 90 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (89 - i));
    
    const daysSince = i;
    const trendComponent = daysSince * 0.18;
    const volatilityComponent = Math.sin(daysSince * 0.22) * 6;
    const randomComponent = (Math.random() - 0.5) * 7;
    
    const dailyChangePercent = (trendComponent + volatilityComponent + randomComponent) / 100;
    const startingEquity = 50000;
    const equity = startingEquity * (1 + (daysSince * 0.005 + dailyChangePercent));
    
    return {
      agent_id: 'eliza-1',
      date: date.toISOString().split('T')[0],
      equity: Math.round(equity),
      daily_pnl: Math.round(equity * dailyChangePercent),
      daily_pnl_percent: parseFloat((dailyChangePercent * 100).toFixed(2)),
      trades_count: Math.floor(Math.random() * 10) + 3,
      win_rate: parseFloat((Math.random() * 20 + 55).toFixed(2)),
      markets_traded: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'MATIC-USD', 'DOT-USD'],
      strategy_allocation: { trend: 40, momentum: 40, mean_reversion: 20 }
    };
  }),
  
  // Agent 5 (MarketMaker) - Standard agent with market making strategy
  ...Array.from({ length: 90 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (89 - i));
    
    const daysSince = i;
    const trendComponent = daysSince * 0.06; // Lower trend component
    const volatilityComponent = Math.sin(daysSince * 0.1) * 2; // Lower volatility
    const randomComponent = (Math.random() - 0.5) * 2;
    
    const dailyChangePercent = (trendComponent + volatilityComponent + randomComponent) / 100;
    const startingEquity = 100000;
    const equity = startingEquity * (1 + (daysSince * 0.0015 + dailyChangePercent));
    
    return {
      agent_id: 'agent-4',
      date: date.toISOString().split('T')[0],
      equity: Math.round(equity),
      daily_pnl: Math.round(equity * dailyChangePercent),
      daily_pnl_percent: parseFloat((dailyChangePercent * 100).toFixed(2)),
      trades_count: Math.floor(Math.random() * 30) + 20, // Many trades for market making
      win_rate: parseFloat((Math.random() * 8 + 75).toFixed(2)), // Very high win rate, low returns per trade
      markets_traded: ['BTC-USD', 'ETH-USD'],
      strategy_allocation: { market_making: 100 }
    };
  })
];

// Mock strategy performance metrics
export const mockStrategyPerformance = [
  {
    strategy_id: 'trend-following',
    name: 'Trend Following',
    description: 'Follows market trends to capture directional moves',
    metrics: {
      annualized_return: 24.5,
      win_rate: 58.3,
      average_trade_duration: 2.5, // days
      sharpe_ratio: 1.85,
      max_drawdown: -15.2,
      volatility: 18.5,
      correlation_to_btc: 0.75,
      correlation_to_sp500: 0.35
    },
    market_performance: {
      'BTC-USD': { return: 28.7, win_rate: 62.5, trades: 48 },
      'ETH-USD': { return: 32.1, win_rate: 59.8, trades: 52 },
      'SOL-USD': { return: 41.2, win_rate: 55.3, trades: 38 }
    }
  },
  {
    strategy_id: 'arbitrage',
    name: 'Cross-Exchange Arbitrage',
    description: 'Capitalizes on price differences between exchanges',
    metrics: {
      annualized_return: 18.2,
      win_rate: 82.5,
      average_trade_duration: 0.05, // days (about an hour)
      sharpe_ratio: 2.45,
      max_drawdown: -5.7,
      volatility: 7.8,
      correlation_to_btc: 0.15,
      correlation_to_sp500: 0.08
    },
    market_performance: {
      'BTC-USD': { return: 15.3, win_rate: 84.2, trades: 350 },
      'ETH-USD': { return: 18.7, win_rate: 81.9, trades: 325 },
      'SOL-USD': { return: 21.5, win_rate: 79.8, trades: 280 }
    }
  },
  {
    strategy_id: 'momentum',
    name: 'Momentum Trading',
    description: 'Trades based on price velocity and acceleration',
    metrics: {
      annualized_return: 32.8,
      win_rate: 52.5,
      average_trade_duration: 1.2, // days
      sharpe_ratio: 1.65,
      max_drawdown: -22.5,
      volatility: 26.3,
      correlation_to_btc: 0.85,
      correlation_to_sp500: 0.45
    },
    market_performance: {
      'BTC-USD': { return: 35.2, win_rate: 53.5, trades: 85 },
      'ETH-USD': { return: 42.7, win_rate: 51.8, trades: 78 },
      'SOL-USD': { return: 58.5, win_rate: 48.7, trades: 92 },
      'AVAX-USD': { return: 37.9, win_rate: 50.2, trades: 65 }
    }
  },
  {
    strategy_id: 'mean-reversion',
    name: 'Mean Reversion',
    description: 'Trades market deviations from historical averages',
    metrics: {
      annualized_return: 21.5,
      win_rate: 65.8,
      average_trade_duration: 0.8, // days
      sharpe_ratio: 1.95,
      max_drawdown: -12.3,
      volatility: 14.2,
      correlation_to_btc: 0.35,
      correlation_to_sp500: 0.25
    },
    market_performance: {
      'BTC-USD': { return: 18.7, win_rate: 67.2, trades: 105 },
      'ETH-USD': { return: 22.5, win_rate: 65.8, trades: 112 },
      'SOL-USD': { return: 27.8, win_rate: 63.5, trades: 95 }
    }
  },
  {
    strategy_id: 'market-making',
    name: 'Market Making',
    description: 'Provides liquidity and profits from bid-ask spread',
    metrics: {
      annualized_return: 15.5,
      win_rate: 85.2,
      average_trade_duration: 0.02, // days (about 30 minutes)
      sharpe_ratio: 2.85,
      max_drawdown: -4.2,
      volatility: 6.5,
      correlation_to_btc: 0.12,
      correlation_to_sp500: 0.05
    },
    market_performance: {
      'BTC-USD': { return: 14.8, win_rate: 87.3, trades: 1250 },
      'ETH-USD': { return: 16.2, win_rate: 85.9, trades: 1350 }
    }
  }
];

// Mock risk metrics
export const mockRiskMetrics = [
  {
    farm_id: 'farm-1',
    date: new Date().toISOString().split('T')[0],
    total_exposure: 65000,
    exposure_by_asset: {
      'BTC': 40000,
      'ETH': 15000,
      'SOL': 10000
    },
    exposure_by_market: {
      'BTC-USD': 40000,
      'ETH-USD': 15000,
      'SOL-USD': 10000
    },
    correlation_matrix: {
      'BTC-USD': { 'BTC-USD': 1.0, 'ETH-USD': 0.82, 'SOL-USD': 0.75 },
      'ETH-USD': { 'BTC-USD': 0.82, 'ETH-USD': 1.0, 'SOL-USD': 0.78 },
      'SOL-USD': { 'BTC-USD': 0.75, 'ETH-USD': 0.78, 'SOL-USD': 1.0 }
    },
    var_95: 5200, // Value at Risk (95% confidence)
    var_99: 8500, // Value at Risk (99% confidence)
    stress_test_results: {
      'market_crash_20_percent': -13000,
      'volatility_spike_50_percent': -8500,
      'liquidity_crisis': -11000
    }
  },
  {
    farm_id: 'farm-2',
    date: new Date().toISOString().split('T')[0],
    total_exposure: 185000,
    exposure_by_asset: {
      'BTC': 95000,
      'ETH': 45000,
      'SOL': 35000,
      'AVAX': 10000
    },
    exposure_by_market: {
      'BTC-USD': 95000,
      'ETH-USD': 45000,
      'SOL-USD': 35000,
      'AVAX-USD': 10000
    },
    correlation_matrix: {
      'BTC-USD': { 'BTC-USD': 1.0, 'ETH-USD': 0.82, 'SOL-USD': 0.75, 'AVAX-USD': 0.68 },
      'ETH-USD': { 'BTC-USD': 0.82, 'ETH-USD': 1.0, 'SOL-USD': 0.78, 'AVAX-USD': 0.72 },
      'SOL-USD': { 'BTC-USD': 0.75, 'ETH-USD': 0.78, 'SOL-USD': 1.0, 'AVAX-USD': 0.77 },
      'AVAX-USD': { 'BTC-USD': 0.68, 'ETH-USD': 0.72, 'SOL-USD': 0.77, 'AVAX-USD': 1.0 }
    },
    var_95: 15800, // Value at Risk (95% confidence)
    var_99: 26500, // Value at Risk (99% confidence)
    stress_test_results: {
      'market_crash_20_percent': -37000,
      'volatility_spike_50_percent': -24500,
      'liquidity_crisis': -31000
    }
  }
];

// Helper functions for performance data
export function getFarmPerformanceByDateRange(farmId: string, startDate: string, endDate: string) {
  return mockFarmPerformance.filter(perf => 
    perf.farm_id === farmId && 
    perf.date >= startDate && 
    perf.date <= endDate
  );
}

export function getAgentPerformanceByDateRange(agentId: string, startDate: string, endDate: string) {
  return mockAgentPerformance.filter(perf => 
    perf.agent_id === agentId && 
    perf.date >= startDate && 
    perf.date <= endDate
  );
}

export function getRiskMetricsByFarmId(farmId: string) {
  return mockRiskMetrics.find(metrics => metrics.farm_id === farmId) || null;
}

export function getStrategyPerformanceById(strategyId: string) {
  return mockStrategyPerformance.find(strategy => strategy.strategy_id === strategyId) || null;
}

export function getStrategyPerformanceByMarket(strategyId: string, marketId: string) {
  const strategy = mockStrategyPerformance.find(s => s.strategy_id === strategyId);
  return strategy ? strategy.market_performance[marketId] || null : null;
}

// Calculate aggregate performance metrics
export function getAggregateFarmMetrics(farmId: string) {
  const farmPerf = mockFarmPerformance.filter(perf => perf.farm_id === farmId);
  
  if (farmPerf.length === 0) return null;
  
  const initialEquity = farmPerf[0].equity;
  const latestEquity = farmPerf[farmPerf.length - 1].equity;
  
  const totalReturn = (latestEquity - initialEquity) / initialEquity * 100;
  
  // Calculate daily returns
  const dailyReturns = farmPerf.map(day => day.daily_pnl_percent / 100);
  
  // Calculate annualized return (assuming 252 trading days)
  const avgDailyReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
  const annualizedReturn = (Math.pow(1 + avgDailyReturn, 252) - 1) * 100;
  
  // Calculate volatility (annualized standard deviation of returns)
  const meanReturn = avgDailyReturn;
  const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / dailyReturns.length;
  const stdDev = Math.sqrt(variance);
  const annualizedVolatility = stdDev * Math.sqrt(252) * 100;
  
  // Calculate Sharpe ratio (assuming risk-free rate of 0.02 or 2%)
  const riskFreeRate = 0.02;
  const sharpeRatio = (annualizedReturn / 100 - riskFreeRate) / (annualizedVolatility / 100);
  
  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = initialEquity;
  
  farmPerf.forEach(day => {
    if (day.equity > peak) {
      peak = day.equity;
    }
    
    const drawdown = (peak - day.equity) / peak * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });
  
  return {
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
    volatility: parseFloat(annualizedVolatility.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    winRate: parseFloat((farmPerf.reduce((sum, day) => sum + day.win_rate, 0) / farmPerf.length).toFixed(2)),
    totalTrades: farmPerf.reduce((sum, day) => sum + day.trades_count, 0)
  };
}
