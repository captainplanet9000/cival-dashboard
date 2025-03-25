/**
 * Client-safe database utilities
 * 
 * This file provides browser-compatible alternatives to server-only database functions.
 * It uses API routes instead of direct database connections to maintain the Trading Farm
 * dashboard's architecture while preventing Node.js module errors in the browser.
 */

import { Agent, Farm, AgentTrade } from '@/types/database';

// Mock data for development and fallbacks
const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    name: 'BTC Trend Agent',
    status: 'active',
    type: 'trend',
    performance: 12.5,
    trades: 45,
    winRate: 67,
    createdAt: '2025-02-15',
    specialization: ['Bitcoin'],
    level: 'advanced',
    description: 'Specialized in Bitcoin trend following',
    detailedPerformance: {
      daily: 0.8,
      weekly: 3.2,
      monthly: 12.5,
      allTime: 18.7,
      trades: { won: 30, lost: 15, total: 45 },
      profitFactor: 2.3,
      avgDuration: '3h 42m'
    },
    settings: {
      riskLevel: 'medium',
      maxDrawdown: 15,
      positionSizing: 10,
      tradesPerDay: 5,
      automationLevel: 'full',
      timeframes: ['1h', '4h', 'Daily'],
      indicators: ['RSI', 'Moving Averages', 'Volume']
    },
    instructions: [
      {
        id: 'instr-1',
        content: 'Focus on Bitcoin market trends and volatility patterns',
        createdAt: '2025-02-15T12:30:00Z',
        enabled: true,
        category: 'market',
        impact: 'high'
      }
    ]
  },
  {
    id: 'agent-2',
    name: 'ETH Arbitrage Agent',
    status: 'paused',
    type: 'arbitrage',
    performance: 8.3,
    trades: 120,
    winRate: 72,
    createdAt: '2025-02-10',
    specialization: ['Ethereum'],
    level: 'basic',
    description: 'Cross-exchange arbitrage for Ethereum',
    detailedPerformance: {
      daily: 0.3,
      weekly: 2.1,
      monthly: 8.3,
      allTime: 10.5,
      trades: { won: 86, lost: 34, total: 120 },
      profitFactor: 1.8,
      avgDuration: '45m'
    },
    settings: {
      riskLevel: 'low',
      maxDrawdown: 5,
      positionSizing: 25,
      tradesPerDay: 15,
      automationLevel: 'full',
      timeframes: ['1m', '5m', '15m'],
      indicators: ['Price Divergence', 'Liquidity', 'Fees']
    },
    instructions: []
  }
];

const mockFarms: Farm[] = [
  {
    id: 'farm-1',
    name: 'Alpha Strategy Farm',
    status: 'active',
    agents: 5,
    createdAt: '2025-01-20',
    lastActive: '2025-03-20T08:45:00Z',
    performance: 18.7,
    resources: { cpu: 65, memory: 48, bandwidth: 32 },
    bossman: {
      model: 'ElizaOS-Advanced',
      status: 'coordinating',
      instructions: 12
    }
  },
  {
    id: 'farm-2',
    name: 'Volatility Harvester',
    status: 'paused',
    agents: 3,
    createdAt: '2025-02-05',
    lastActive: '2025-03-19T22:15:00Z',
    performance: 7.2,
    resources: { cpu: 28, memory: 32, bandwidth: 18 },
    bossman: {
      model: 'ElizaOS-Basic',
      status: 'idle',
      instructions: 8
    }
  }
];

// Async functions that use the API routes instead of direct database access
// These are safe to use in client components

export async function getAgents(): Promise<Agent[]> {
  try {
    const response = await fetch('/api/database/agents');
    if (!response.ok) throw new Error('Failed to fetch agents');
    return await response.json();
  } catch (error) {
    console.error('Error fetching agents:', error);
    return mockAgents; // Fallback to mock data
  }
}

export async function getAgent(id: string): Promise<Agent | null> {
  try {
    const response = await fetch(`/api/database/agents/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch agent ${id}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching agent ${id}:`, error);
    return mockAgents.find(a => a.id === id) || null; // Fallback to mock data
  }
}

export async function getFarms(): Promise<Farm[]> {
  try {
    const response = await fetch('/api/database/farms');
    if (!response.ok) throw new Error('Failed to fetch farms');
    return await response.json();
  } catch (error) {
    console.error('Error fetching farms:', error);
    return mockFarms; // Fallback to mock data
  }
}

export async function getFarm(id: string): Promise<Farm | null> {
  try {
    const response = await fetch(`/api/database/farms/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch farm ${id}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching farm ${id}:`, error);
    return mockFarms.find(f => f.id === id) || null; // Fallback to mock data
  }
}

export async function getAgentTrades(agentId: string): Promise<AgentTrade[]> {
  try {
    const response = await fetch(`/api/database/agent-trades?agentId=${agentId}`);
    if (!response.ok) throw new Error(`Failed to fetch trades for agent ${agentId}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching trades for agent ${agentId}:`, error);
    return []; // Fallback to empty array
  }
}

// Add more client-safe database functions as needed
