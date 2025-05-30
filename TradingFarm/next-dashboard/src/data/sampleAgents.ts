import { Agent } from '@/types/agent';

export const sampleAgentData: Agent[] = [
  {
    id: '1',
    name: 'TrendSurfer',
    status: 'active',
    type: 'Algorithmic',
    description: 'Trend following algorithm focused on major crypto pairs',
    model: 'GPT-4o',
    performance: {
      day: 2.5,
      week: 7.8,
      month: 21.3,
      winRate: 68,
      avgProfit: 1.2
    },
    farm: {
      id: 'farm-1',
      name: 'Crypto Alpha'
    },
    trades: [
      { id: 'tr-1', pair: 'BTC/USDT', type: 'buy', amount: 0.2, price: 52800, time: '2023-03-23T14:32:15Z', profit: 2.3 },
      { id: 'tr-2', pair: 'ETH/USDT', type: 'sell', amount: 1.5, price: 3150, time: '2023-03-23T13:15:22Z', profit: -0.8 },
    ],
    capabilities: ['Technical Analysis', 'Market Data', 'Automated Execution'],
    tools: [
      { name: 'TradingView API', status: 'active', lastUsed: '20 min ago', usageLevel: 'High' },
      { name: 'DEX Aggregator', status: 'active', lastUsed: '35 min ago', usageLevel: 'Medium' },
      { name: 'Risk Calculator', status: 'active', lastUsed: '1h ago', usageLevel: 'Low' }
    ]
  },
  {
    id: '2',
    name: 'DCA Master',
    status: 'active',
    type: 'Dollar Cost Avg',
    description: 'Dollar cost averaging strategy for long-term crypto investments',
    model: 'Claude 3',
    performance: {
      day: 0.8,
      week: 3.2,
      month: 14.5,
      winRate: 82,
      avgProfit: 0.6
    },
    farm: {
      id: 'farm-2',
      name: 'Long Term'
    }
  },
  {
    id: '3',
    name: 'SONIC Hunter',
    status: 'paused',
    type: 'MEV',
    description: 'Mempool monitoring for arbitrage opportunities',
    model: 'Claude 3',
    performance: {
      day: -1.2,
      week: 5.8,
      month: 34.6,
      winRate: 61,
      avgProfit: 3.4
    },
    farm: {
      id: 'farm-3',
      name: 'MEV Special'
    }
  },
  {
    id: '4',
    name: 'StableCoin Arb',
    status: 'active',
    type: 'Arbitrage',
    description: 'Stablecoin arbitrage across major exchanges',
    model: 'GPT-4o',
    performance: {
      day: 0.3,
      week: 1.8,
      month: 7.2,
      winRate: 91,
      avgProfit: 0.2
    },
    farm: {
      id: 'farm-1',
      name: 'Crypto Alpha'
    }
  },
  {
    id: '5',
    name: 'MacroTrend',
    status: 'error',
    type: 'Fundamental',
    description: 'Macro economic trend analysis for crypto markets',
    model: 'Claude 3',
    performance: {
      day: -0.8,
      week: -1.2,
      month: 3.5,
      winRate: 55,
      avgProfit: 0.8
    },
    farm: {
      id: 'farm-2',
      name: 'Long Term'
    }
  }
];
