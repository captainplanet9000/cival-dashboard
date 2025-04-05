/**
 * Mock Agent Data
 * Comprehensive mock data for all agent types in the Trading Farm
 */

// Standard Trading Agents
export const mockStandardAgents = [
  {
    id: 'agent-1',
    farm_id: 'farm-1',
    name: 'TrendBot',
    description: 'Trend following strategy specialist',
    status: 'active',
    type: 'standard',
    capabilities: ['market_analysis', 'trade_execution', 'risk_management'],
    model: 'gpt-4',
    created_at: '2025-03-10T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z',
    config: {
      personality: 'analytical',
      risk_tolerance: 'medium',
      allowed_markets: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
      strategy_type: 'trend_following',
      risk_level: 'medium',
      target_markets: ['BTC-USD', 'ETH-USD'],
      performance_metrics: {
        win_rate: 68,
        profit_loss: 7.2,
        total_trades: 65,
        average_trade_duration: 140
      }
    },
    performance: {
      win_rate: 68,
      profit_loss: 7.2,
      total_trades: 65,
      average_trade_duration: 140
    }
  },
  {
    id: 'agent-2',
    farm_id: 'farm-1',
    name: 'MarketInsight',
    description: 'Market analysis and research assistant',
    status: 'active',
    type: 'standard',
    capabilities: ['market_analysis', 'sentiment_analysis', 'report_generation'],
    model: 'claude-3-sonnet',
    created_at: '2025-03-15T00:00:00Z',
    updated_at: '2025-03-30T00:00:00Z',
    config: {
      data_sources: ['news', 'social_media', 'technical_indicators'],
      update_frequency: 'hourly',
      strategy_type: 'research',
      risk_level: 'low',
      target_markets: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD', 'MATIC-USD'],
      performance_metrics: {
        win_rate: 0,
        profit_loss: 0,
        total_trades: 0,
        average_trade_duration: 0
      }
    },
    performance: {
      win_rate: 0,
      profit_loss: 0,
      total_trades: 0,
      average_trade_duration: 0
    }
  },
  {
    id: 'agent-3',
    farm_id: 'farm-1',
    name: 'DCA Master',
    description: 'Dollar-cost averaging specialist for long-term accumulation',
    status: 'active',
    type: 'standard',
    capabilities: ['trade_execution', 'portfolio_rebalancing'],
    model: 'gpt-4',
    created_at: '2025-02-10T00:00:00Z',
    updated_at: '2025-03-25T00:00:00Z',
    config: {
      purchase_interval: 'weekly',
      allocation_strategy: 'fixed',
      strategy_type: 'accumulation',
      risk_level: 'low',
      target_markets: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
      performance_metrics: {
        win_rate: 72,
        profit_loss: 12.5,
        total_trades: 30,
        average_trade_duration: 0
      }
    },
    performance: {
      win_rate: 72,
      profit_loss: 12.5,
      total_trades: 30,
      average_trade_duration: 0
    }
  },
  {
    id: 'agent-4',
    farm_id: 'farm-2',
    name: 'Yield Hunter',
    description: 'DeFi yield optimization specialist',
    status: 'active',
    type: 'standard',
    capabilities: ['yield_farming', 'risk_management', 'market_analysis'],
    model: 'gpt-4',
    created_at: '2025-02-20T00:00:00Z',
    updated_at: '2025-03-28T00:00:00Z',
    config: {
      yield_threshold: 5.0,
      risk_tolerance: 'medium',
      rebalance_frequency: 'weekly',
      strategy_type: 'yield',
      risk_level: 'medium',
      target_markets: ['USDC-USD', 'USDT-USD', 'DAI-USD'],
      performance_metrics: {
        win_rate: 91,
        profit_loss: 4.8,
        total_trades: 12,
        average_trade_duration: 0
      }
    },
    performance: {
      win_rate: 91,
      profit_loss: 4.8,
      total_trades: 12,
      average_trade_duration: 0
    }
  },
  {
    id: 'agent-5',
    farm_id: 'farm-2',
    name: 'Hedge Master',
    description: 'Portfolio hedging and protection specialist',
    status: 'active',
    type: 'standard',
    capabilities: ['risk_management', 'options_trading', 'portfolio_analysis'],
    model: 'claude-3-opus',
    created_at: '2025-02-15T00:00:00Z',
    updated_at: '2025-03-20T00:00:00Z',
    config: {
      hedge_ratio: 0.4,
      instruments: ['options', 'futures', 'inverse_etfs'],
      strategy_type: 'hedging',
      risk_level: 'high',
      target_markets: ['BTC-USD', 'SPY-USD', 'VIX-USD'],
      performance_metrics: {
        win_rate: 62,
        profit_loss: -1.2,
        total_trades: 18,
        average_trade_duration: 45
      }
    },
    performance: {
      win_rate: 62,
      profit_loss: -1.2,
      total_trades: 18,
      average_trade_duration: 45
    }
  }
];

// ElizaOS Agents
export const mockElizaAgents = [
  {
    id: 'eliza-1',
    farm_id: 'farm-1',
    name: 'Eliza Alpha',
    description: 'Advanced multi-strategy trading AI with natural language capabilities',
    status: 'active',
    type: 'eliza',
    capabilities: ['market_analysis', 'trade_execution', 'risk_management', 'sentiment_analysis', 'report_generation'],
    model: 'gpt-4',
    created_at: '2025-03-05T00:00:00Z',
    updated_at: '2025-04-01T00:00:00Z',
    config: {
      personality: 'balanced',
      strategy_type: 'multi_strategy',
      risk_level: 'medium',
      target_markets: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD'],
      apiAccess: true,
      tradingPermissions: 'execute',
      autoRecovery: true,
      instructions: 'Focus on identifying market trends and execute trades when confidence exceeds 80%. Maintain a balanced risk profile and provide daily trading summaries.',
      performance_metrics: {
        win_rate: 72,
        profit_loss: 11.5,
        total_trades: 85,
        average_trade_duration: 120
      }
    },
    performance: {
      win_rate: 72,
      profit_loss: 11.5,
      total_trades: 85,
      average_trade_duration: 120
    },
    conversation_history: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'What's your current assessment of BTC?',
        timestamp: '2025-04-01T10:30:00Z'
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Bitcoin is showing bullish momentum with strong support at the $58,500 level. Volume indicators suggest accumulation by institutional investors. I recommend maintaining our current positions with a trailing stop at $57,800.',
        timestamp: '2025-04-01T10:30:15Z'
      },
      {
        id: 'msg-3',
        role: 'user',
        content: 'Should we increase our ETH allocation?',
        timestamp: '2025-04-01T10:31:00Z'
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: 'ETH is consolidating after its recent rally. While fundamentals remain strong, the BTC/ETH ratio suggests waiting for a better entry point. I recommend holding our current allocation and setting buy orders at $1,850 and $1,780 to capitalize on any pullbacks.',
        timestamp: '2025-04-01T10:31:20Z'
      }
    ]
  },
  {
    id: 'eliza-2',
    farm_id: 'farm-1',
    name: 'Eliza Research',
    description: 'AI research assistant specializing in fundamental analysis',
    status: 'active',
    type: 'eliza',
    capabilities: ['market_analysis', 'sentiment_analysis', 'report_generation'],
    model: 'claude-3-opus',
    created_at: '2025-03-10T00:00:00Z',
    updated_at: '2025-03-28T00:00:00Z',
    config: {
      personality: 'analytical',
      strategy_type: 'research',
      risk_level: 'low',
      target_markets: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD', 'MATIC-USD', 'DOT-USD', 'ADA-USD'],
      apiAccess: true,
      tradingPermissions: 'read',
      autoRecovery: true,
      instructions: 'Analyze market trends, news sentiment, and on-chain metrics to produce comprehensive research reports. Focus on correlation between assets and macroeconomic factors.',
      performance_metrics: {
        win_rate: 0,
        profit_loss: 0,
        total_trades: 0,
        average_trade_duration: 0
      }
    },
    performance: {
      win_rate: 0,
      profit_loss: 0,
      total_trades: 0,
      average_trade_duration: 0
    },
    conversation_history: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Prepare a weekly report on the DeFi sector',
        timestamp: '2025-03-28T14:00:00Z'
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'I'll analyze the current DeFi market conditions and prepare a comprehensive report. Would you like me to focus on any specific metrics or protocols?',
        timestamp: '2025-03-28T14:00:20Z'
      },
      {
        id: 'msg-3',
        role: 'user',
        content: 'Focus on TVL trends and yield opportunities',
        timestamp: '2025-03-28T14:01:00Z'
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: 'I'll focus on Total Value Locked trends across major protocols and identify the most attractive yield opportunities with appropriate risk assessments. The report will be ready in approximately 2 hours.',
        timestamp: '2025-03-28T14:01:30Z'
      }
    ]
  },
  {
    id: 'eliza-3',
    farm_id: 'farm-2',
    name: 'Eliza Swing',
    description: 'Swing trading specialist using technical and sentiment analysis',
    status: 'active',
    type: 'eliza',
    capabilities: ['market_analysis', 'sentiment_analysis', 'trade_execution', 'risk_management'],
    model: 'gpt-4',
    created_at: '2025-02-20T00:00:00Z',
    updated_at: '2025-03-25T00:00:00Z',
    config: {
      personality: 'decisive',
      strategy_type: 'swing',
      risk_level: 'high',
      target_markets: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD'],
      apiAccess: true,
      tradingPermissions: 'execute',
      autoRecovery: true,
      instructions: 'Identify swing trading opportunities using technical analysis and sentiment data. Hold positions for 3-10 days based on market momentum. Use tight stop losses and target 5-15% gains per trade.',
      performance_metrics: {
        win_rate: 63,
        profit_loss: 18.7,
        total_trades: 42,
        average_trade_duration: 96
      }
    },
    performance: {
      win_rate: 63,
      profit_loss: 18.7,
      total_trades: 42,
      average_trade_duration: 96
    }
  },
  {
    id: 'eliza-4',
    farm_id: 'farm-2',
    name: 'Eliza Yield',
    description: 'DeFi yield optimization specialist with protocol risk assessment',
    status: 'active',
    type: 'eliza',
    capabilities: ['yield_farming', 'risk_management', 'market_analysis'],
    model: 'claude-3-sonnet',
    created_at: '2025-03-01T00:00:00Z',
    updated_at: '2025-03-30T00:00:00Z',
    config: {
      personality: 'cautious',
      strategy_type: 'yield',
      risk_level: 'medium',
      target_markets: ['USDC-USD', 'USDT-USD', 'DAI-USD'],
      apiAccess: true,
      tradingPermissions: 'suggest',
      autoRecovery: true,
      instructions: 'Monitor and analyze DeFi yield opportunities across top protocols. Assess risks including smart contract vulnerabilities, protocol governance, and market conditions. Provide recommendations for optimal stablecoin allocation to maximize risk-adjusted returns.',
      performance_metrics: {
        win_rate: 95,
        profit_loss: 6.2,
        total_trades: 15,
        average_trade_duration: 0
      }
    },
    performance: {
      win_rate: 95,
      profit_loss: 6.2,
      total_trades: 15,
      average_trade_duration: 0
    }
  },
  {
    id: 'eliza-5',
    farm_id: 'farm-1',
    name: 'Eliza Arbitrage',
    description: 'Cross-exchange arbitrage opportunity hunter',
    status: 'active',
    type: 'eliza',
    capabilities: ['arbitrage', 'trade_execution', 'risk_management'],
    model: 'gpt-4',
    created_at: '2025-03-20T00:00:00Z',
    updated_at: '2025-04-02T00:00:00Z',
    config: {
      personality: 'opportunistic',
      strategy_type: 'arbitrage',
      risk_level: 'medium',
      target_markets: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
      apiAccess: true,
      tradingPermissions: 'execute',
      autoRecovery: true,
      instructions: 'Monitor price discrepancies across exchanges for arbitrage opportunities. Execute trades when price differences exceed transaction costs plus a 0.2% profit margin. Focus on high liquidity pairs to minimize slippage.',
      performance_metrics: {
        win_rate: 98,
        profit_loss: 3.8,
        total_trades: 128,
        average_trade_duration: 5
      }
    },
    performance: {
      win_rate: 98,
      profit_loss: 3.8,
      total_trades: 128,
      average_trade_duration: 5
    }
  }
];

// Combine all agents for easy access
export const mockAllAgents = [...mockStandardAgents, ...mockElizaAgents];

// Agent performance history (daily records)
export const mockAgentPerformanceHistory = [
  // Eliza Alpha performance history (recent 7 days)
  {
    agent_id: 'eliza-1',
    date: '2025-03-26T00:00:00Z',
    win_rate: 70,
    profit_loss: 0.8,
    trades_executed: 4,
    assets_under_management: 28500
  },
  {
    agent_id: 'eliza-1',
    date: '2025-03-27T00:00:00Z',
    win_rate: 68,
    profit_loss: -0.3,
    trades_executed: 3,
    assets_under_management: 28400
  },
  {
    agent_id: 'eliza-1',
    date: '2025-03-28T00:00:00Z',
    win_rate: 69,
    profit_loss: 1.2,
    trades_executed: 5,
    assets_under_management: 28750
  },
  {
    agent_id: 'eliza-1',
    date: '2025-03-29T00:00:00Z',
    win_rate: 70,
    profit_loss: 0.5,
    trades_executed: 2,
    assets_under_management: 28900
  },
  {
    agent_id: 'eliza-1',
    date: '2025-03-30T00:00:00Z',
    win_rate: 71,
    profit_loss: 0.9,
    trades_executed: 4,
    assets_under_management: 29150
  },
  {
    agent_id: 'eliza-1',
    date: '2025-03-31T00:00:00Z',
    win_rate: 72,
    profit_loss: 1.5,
    trades_executed: 6,
    assets_under_management: 29600
  },
  {
    agent_id: 'eliza-1',
    date: '2025-04-01T00:00:00Z',
    win_rate: 72,
    profit_loss: 0.2,
    trades_executed: 3,
    assets_under_management: 29650
  },
  
  // Eliza Swing performance history (recent 7 days)
  {
    agent_id: 'eliza-3',
    date: '2025-03-26T00:00:00Z',
    win_rate: 61,
    profit_loss: 0,
    trades_executed: 0,
    assets_under_management: 35200
  },
  {
    agent_id: 'eliza-3',
    date: '2025-03-27T00:00:00Z',
    win_rate: 61,
    profit_loss: 2.8,
    trades_executed: 2,
    assets_under_management: 36200
  },
  {
    agent_id: 'eliza-3',
    date: '2025-03-28T00:00:00Z',
    win_rate: 62,
    profit_loss: 0,
    trades_executed: 0,
    assets_under_management: 36200
  },
  {
    agent_id: 'eliza-3',
    date: '2025-03-29T00:00:00Z',
    win_rate: 62,
    profit_loss: -1.2,
    trades_executed: 1,
    assets_under_management: 35750
  },
  {
    agent_id: 'eliza-3',
    date: '2025-03-30T00:00:00Z',
    win_rate: 62,
    profit_loss: 0,
    trades_executed: 0,
    assets_under_management: 35750
  },
  {
    agent_id: 'eliza-3',
    date: '2025-03-31T00:00:00Z',
    win_rate: 62,
    profit_loss: 3.5,
    trades_executed: 2,
    assets_under_management: 37000
  },
  {
    agent_id: 'eliza-3',
    date: '2025-04-01T00:00:00Z',
    win_rate: 63,
    profit_loss: 0,
    trades_executed: 0,
    assets_under_management: 37000
  },
  
  // TrendBot performance history (recent 7 days)
  {
    agent_id: 'agent-1',
    date: '2025-03-26T00:00:00Z',
    win_rate: 66,
    profit_loss: 0.5,
    trades_executed: 3,
    assets_under_management: 25000
  },
  {
    agent_id: 'agent-1',
    date: '2025-03-27T00:00:00Z',
    win_rate: 66,
    profit_loss: 0.2,
    trades_executed: 2,
    assets_under_management: 25050
  },
  {
    agent_id: 'agent-1',
    date: '2025-03-28T00:00:00Z',
    win_rate: 67,
    profit_loss: 0.8,
    trades_executed: 4,
    assets_under_management: 25250
  },
  {
    agent_id: 'agent-1',
    date: '2025-03-29T00:00:00Z',
    win_rate: 67,
    profit_loss: -0.3,
    trades_executed: 3,
    assets_under_management: 25175
  },
  {
    agent_id: 'agent-1',
    date: '2025-03-30T00:00:00Z',
    win_rate: 67,
    profit_loss: 0.4,
    trades_executed: 2,
    assets_under_management: 25275
  },
  {
    agent_id: 'agent-1',
    date: '2025-03-31T00:00:00Z',
    win_rate: 68,
    profit_loss: 1.1,
    trades_executed: 5,
    assets_under_management: 25550
  },
  {
    agent_id: 'agent-1',
    date: '2025-04-01T00:00:00Z',
    win_rate: 68,
    profit_loss: 0.6,
    trades_executed: 3,
    assets_under_management: 25700
  }
];

// Agent actions log
export const mockAgentActionsLog = [
  {
    id: 'action-1001',
    agent_id: 'eliza-1',
    action_type: 'trade',
    status: 'completed',
    details: {
      trade_type: 'buy',
      market: 'BTC-USD',
      amount: 0.15,
      price: 60250,
      timestamp: '2025-04-01T08:30:00Z'
    },
    context: 'Executed based on momentum breakout pattern',
    timestamp: '2025-04-01T08:30:15Z'
  },
  {
    id: 'action-1002',
    agent_id: 'eliza-1',
    action_type: 'analysis',
    status: 'completed',
    details: {
      analysis_type: 'technical',
      market: 'ETH-USD',
      indicators: ['RSI', 'MACD', 'Bollinger Bands'],
      timestamp: '2025-04-01T09:15:00Z'
    },
    context: 'Regular market analysis',
    timestamp: '2025-04-01T09:16:20Z'
  },
  {
    id: 'action-1003',
    agent_id: 'eliza-3',
    action_type: 'trade',
    status: 'completed',
    details: {
      trade_type: 'sell',
      market: 'SOL-USD',
      amount: 25,
      price: 122.50,
      timestamp: '2025-03-31T14:45:00Z'
    },
    context: 'Taking profit at resistance level',
    timestamp: '2025-03-31T14:45:30Z'
  },
  {
    id: 'action-1004',
    agent_id: 'agent-1',
    action_type: 'alert',
    status: 'completed',
    details: {
      alert_type: 'price',
      market: 'BTC-USD',
      threshold: 60000,
      direction: 'above',
      timestamp: '2025-04-01T05:20:00Z'
    },
    context: 'Key resistance level breached',
    timestamp: '2025-04-01T05:20:15Z'
  },
  {
    id: 'action-1005',
    agent_id: 'eliza-5',
    action_type: 'trade',
    status: 'completed',
    details: {
      trade_type: 'arbitrage',
      market: 'BTC-USD',
      amount: 0.05,
      buy_exchange: 'Exchange A',
      buy_price: 59950,
      sell_exchange: 'Exchange B',
      sell_price: 60150,
      profit: 10,
      timestamp: '2025-04-01T11:32:00Z'
    },
    context: 'Cross-exchange arbitrage opportunity',
    timestamp: '2025-04-01T11:32:45Z'
  }
];

// Helper functions

// Get agents by farm ID
export function getAgentsByFarmId(farmId: string) {
  return mockAllAgents.filter(agent => agent.farm_id === farmId);
}

// Get performance history by agent ID
export function getAgentPerformanceHistory(agentId: string) {
  return mockAgentPerformanceHistory.filter(entry => entry.agent_id === agentId);
}

// Get agent by ID
export function getAgentById(agentId: string) {
  return mockAllAgents.find(agent => agent.id === agentId);
}

// Get agent actions by agent ID
export function getAgentActionsByAgentId(agentId: string) {
  return mockAgentActionsLog.filter(action => action.agent_id === agentId);
}

// Get agents by type
export function getAgentsByType(type: string) {
  return mockAllAgents.filter(agent => agent.type === type);
}
