/**
 * Mock data for farm management to use during development
 */
import { Farm, FarmStatus } from '@/types/farm-management';

// Using string literals instead of the BossmanStatus type to avoid type conflicts
type MockBossmanStatus = 'coordinating' | 'idle' | 'error';

export const mockFarms: Farm[] = [
  {
    id: '1',
    name: 'Alpha Strategy Farm',
    status: 'active' as FarmStatus,
    agents: 5,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastActive: new Date().toISOString(),
    performance: 12.5,
    bossman: {
      model: 'ElizaOS-Advanced',
      status: 'coordinating' as MockBossmanStatus
    },
    resources: {
      cpu: 65,
      memory: 48
    }
  },
  {
    id: '2',
    name: 'Beta Momentum Farm',
    status: 'active' as FarmStatus,
    agents: 3,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    lastActive: new Date().toISOString(),
    performance: 8.2,
    bossman: {
      model: 'ElizaOS-Basic',
      status: 'coordinating' as MockBossmanStatus
    },
    resources: {
      cpu: 42,
      memory: 36
    }
  },
  {
    id: '3',
    name: 'Gamma Arbitrage Farm',
    status: 'paused' as FarmStatus,
    agents: 7,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    performance: -2.1,
    bossman: {
      model: 'ElizaOS-Expert',
      status: 'idle' as MockBossmanStatus
    },
    resources: {
      cpu: 10,
      memory: 15
    }
  },
  {
    id: '4',
    name: 'Delta AI Farm',
    status: 'error' as FarmStatus,
    agents: 4,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    lastActive: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    performance: 0,
    bossman: {
      model: 'ElizaOS-Advanced',
      status: 'error' as MockBossmanStatus
    },
    resources: {
      cpu: 85,
      memory: 92
    }
  }
];

export const mockFarmStats = {
  farms: {
    activeFarms: 2,
    pausedFarms: 1,
    errorFarms: 1,
    totalFarms: 4
  },
  messageBus: {
    load: 45,
    recentActivity: [
      { id: 'msg1', messageType: 'command', content: 'Initialize new strategy', sentAt: new Date().toISOString(), status: 'delivered', priority: 2 },
      { id: 'msg2', messageType: 'data', content: 'Market data update', sentAt: new Date().toISOString(), status: 'delivered', priority: 1 },
      { id: 'msg3', messageType: 'alert', content: 'Unusual market activity detected', sentAt: new Date().toISOString(), status: 'delivered', priority: 3 }
    ],
    successRate: 99.2,
    messagesProcessed24h: 15243
  },
  strategyDocuments: {
    totalCount: 87,
    typeDistribution: {
      strategy: 32,
      analysis: 28,
      research: 18,
      risk: 9
    },
    recentDocuments: [
      { id: 'doc1', title: 'Momentum Strategy Analysis', type: 'analysis', createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString(), source: 'AI Analysis', relevanceScore: 0.92 },
      { id: 'doc2', title: 'Market Volatility Report', type: 'report', createdAt: new Date().toISOString(), lastUpdated: new Date().toISOString(), source: 'Manual Research', relevanceScore: 0.86 }
    ]
  },
  performance: {
    averagePerformance: 6.2,
    topPerformer: mockFarms[0], // Alpha Strategy Farm
    worstPerformer: mockFarms[2] // Gamma Arbitrage Farm
  },
  system: {
    status: 'healthy',
    lastUpdated: new Date().toISOString(),
    apiLatency: 120,
    cpuLoad: 45,
    memoryUsage: 62
  },
  bossman: {
    coordinating: 2,
    models: {
      'ElizaOS-Basic': 1,
      'ElizaOS-Advanced': 2,
      'ElizaOS-Expert': 1
    }
  },
  infrastructure: {
    cpuUtilization: 58,
    memoryUtilization: 62,
    networkUtilization: 41
  }
};
