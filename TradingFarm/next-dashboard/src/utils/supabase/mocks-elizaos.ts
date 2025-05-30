/**
 * Mock implementation for ElizaOS integration
 * This provides mock data for the ElizaOS integration with goals system
 */
import { v4 as uuidv4 } from 'uuid';

// Mock commands data
const mockCommands: Record<string, any> = {};

// Mock command responses data
const mockCommandResponses: Record<string, any> = {};

// Mock memories data
let mockMemories: any[] = [
  {
    id: uuidv4(),
    agent_id: 'agent-1',
    memory_type: 'GOAL_ACQUISITION',
    content: 'Analyzing market conditions for SUI acquisition. Current price is $0.57 with moderate volatility.',
    metadata: {
      goalId: 'goal-1',
      memoryType: 'MARKET_CONDITION',
      prices: {
        'SUI': 0.57,
        'SONIC': 1.25,
        'USDC': 1.0
      },
      liquidity: 'MEDIUM',
      trend: 'BULLISH'
    },
    importance: 0.7,
    timestamp: new Date(Date.now() - 12000000).toISOString() // 2 hours ago
  },
  {
    id: uuidv4(),
    agent_id: 'agent-1',
    memory_type: 'GOAL_ACQUISITION',
    content: 'Proposed DEX swap strategy for SUI acquisition. Will swap USDC to SUI via Cetus DEX for best pricing.',
    metadata: {
      goalId: 'goal-1',
      memoryType: 'STRATEGY',
      strategy_type: 'DEX_SWAP',
      parameters: {
        protocol: 'CETUS',
        targetAsset: 'SUI',
        sourceAsset: 'USDC',
        slippage: 0.5
      }
    },
    importance: 0.85,
    timestamp: new Date(Date.now() - 10800000).toISOString() // 3 hours ago
  },
  {
    id: uuidv4(),
    agent_id: 'agent-2',
    memory_type: 'GOAL_ACQUISITION',
    content: 'Executed swap of 1000 USDC to 1750 SUI via Cetus DEX. Transaction successful with 0.3% price impact.',
    metadata: {
      goalId: 'goal-1',
      memoryType: 'EXECUTION',
      transaction_type: 'SWAP',
      asset_from: 'USDC',
      amount_from: 1000,
      asset_to: 'SUI',
      amount_to: 1750,
      transaction_hash: '0x48723a7c9745dc4c225efed8c6a902f423c85d0d2f85b66689cefa3529ed5798'
    },
    importance: 0.9,
    timestamp: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
  },
  {
    id: uuidv4(),
    agent_id: 'agent-3',
    memory_type: 'GOAL_ACQUISITION',
    content: 'Market conditions update: SUI price increased by 3% in the last hour. Volatility has increased.',
    metadata: {
      goalId: 'goal-1',
      memoryType: 'MARKET_CONDITION',
      prices: {
        'SUI': 0.59,
        'SONIC': 1.27,
        'USDC': 1.0
      },
      volatility: 'HIGH',
      trend: 'STRONGLY_BULLISH'
    },
    importance: 0.75,
    timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  },
  {
    id: uuidv4(),
    agent_id: 'agent-1',
    memory_type: 'GOAL_ACQUISITION',
    content: 'Adapting strategy due to increased SUI price volatility. Will split acquisitions into smaller batches.',
    metadata: {
      goalId: 'goal-1',
      memoryType: 'STRATEGY',
      strategy_type: 'DEX_SWAP',
      parameters: {
        protocol: 'CETUS',
        targetAsset: 'SUI',
        sourceAsset: 'USDC',
        slippage: 0.8,
        batches: 4
      }
    },
    importance: 0.85,
    timestamp: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
  },
  {
    id: uuidv4(),
    agent_id: 'agent-2',
    memory_type: 'GOAL_ACQUISITION',
    content: 'Executed first batch swap of 500 USDC to 840 SUI. Transaction successful with 0.4% price impact.',
    metadata: {
      goalId: 'goal-1',
      memoryType: 'EXECUTION',
      transaction_type: 'SWAP',
      asset_from: 'USDC',
      amount_from: 500,
      asset_to: 'SUI',
      amount_to: 840,
      transaction_hash: '0x58291dfc3b4ee1776ab8c8954f3a4a69d231f6fb27d5909d2845903f68e28b61'
    },
    importance: 0.9,
    timestamp: new Date(Date.now() - 900000).toISOString() // 15 minutes ago
  }
];

// Mock agents data
const mockAgents = {
  'agent-1': {
    id: 'agent-1',
    name: 'Market Analyst',
    type: 'ELIZA_AGENT',
    role: 'ANALYST',
    status: 'ACTIVE'
  },
  'agent-2': {
    id: 'agent-2',
    name: 'DEX Trader',
    type: 'ELIZA_AGENT',
    role: 'EXECUTION',
    status: 'ACTIVE'
  },
  'agent-3': {
    id: 'agent-3',
    name: 'Market Monitor',
    type: 'ELIZA_AGENT',
    role: 'MONITORING',
    status: 'ACTIVE'
  }
};

// Mock coordination states
const mockCoordinationStates = {
  'goal-1': {
    goalId: 'goal-1',
    goalName: 'Acquire 10,000 SUI',
    status: 'ACTIVE',
    phase: 'EXECUTION',
    activeAgents: {
      'agent-1': {
        role: 'ANALYST',
        lastCommand: 'PROPOSE_STRATEGY',
        lastActivity: new Date(Date.now() - 1800000).toISOString()
      },
      'agent-2': {
        role: 'EXECUTION',
        lastCommand: 'EXECUTE_TRADE',
        lastActivity: new Date(Date.now() - 900000).toISOString()
      },
      'agent-3': {
        role: 'MONITORING',
        lastCommand: 'MONITOR_PROGRESS',
        lastActivity: new Date(Date.now() - 600000).toISOString()
      }
    },
    selectedStrategy: 'strategy-1',
    currentTransaction: 'transaction-2',
    marketConditions: {
      prices: {
        'SUI': 0.59,
        'SONIC': 1.27,
        'USDC': 1.0,
        'WETH': 3245.78
      },
      liquidity: {
        'SUI/USDC': 'HIGH',
        'SONIC/SUI': 'MEDIUM',
        'WETH/USDC': 'HIGH'
      },
      trends: {
        'SUI': 'STRONGLY_BULLISH',
        'SONIC': 'NEUTRAL',
        'WETH': 'BULLISH'
      },
      volatility: 'HIGH'
    },
    isAdapting: false,
    agentsInfo: mockAgents
  }
};

/**
 * ElizaOS mock data handlers
 */
export const mockElizaOSHandlers = {
  /**
   * Get mock ElizaOS memories for a goal
   */
  getGoalMemories: async (req: Request) => {
    const url = new URL(req.url);
    const goalId = url.searchParams.get('goalId');
    const memoryType = url.searchParams.get('memoryType');
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    
    // Filter memories by goal ID and memory type
    let results = mockMemories.filter(memory => {
      if (goalId && memory.metadata?.goalId !== goalId) {
        return false;
      }
      
      if (memoryType && memory.metadata?.memoryType !== memoryType) {
        return false;
      }
      
      return true;
    });
    
    // Sort by timestamp descending
    results = results.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    // Apply limit
    results = results.slice(0, limit);
    
    return new Response(JSON.stringify({
      data: results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },
  
  /**
   * Store a mock ElizaOS memory
   */
  storeMemory: async (req: Request) => {
    const memory = await req.json();
    
    const newMemory = {
      id: uuidv4(),
      ...memory,
      timestamp: new Date().toISOString()
    };
    
    mockMemories.push(newMemory);
    
    return new Response(JSON.stringify({
      data: newMemory
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },
  
  /**
   * Send a mock ElizaOS command
   */
  sendCommand: async (req: Request) => {
    const command = await req.json();
    
    const newCommand = {
      id: uuidv4(),
      ...command,
      created_at: new Date().toISOString(),
      status: 'PENDING'
    };
    
    mockCommands[newCommand.id] = newCommand;
    
    // Simulate a delayed response
    setTimeout(() => {
      const response = {
        id: uuidv4(),
        command_id: newCommand.id,
        content: {
          success: true,
          message: `Executed ${newCommand.command_type} successfully`,
          data: {
            // Generate mock data based on command type
            ...(newCommand.command_type === 'ANALYZE_MARKET' ? {
              market_analysis: {
                prices: newCommand.content.currentMarketData?.prices || {
                  'SUI': 0.59,
                  'SONIC': 1.27,
                  'USDC': 1.0
                },
                volatility: 'MEDIUM',
                trend: 'BULLISH',
                recommendation: 'FAVORABLE'
              }
            } : {}),
            ...(newCommand.command_type === 'PROPOSE_STRATEGY' ? {
              strategy_type: 'DEX_SWAP',
              parameters: {
                protocol: 'CETUS',
                targetAsset: newCommand.content.goal?.selected_asset || 'SUI',
                sourceAsset: 'USDC',
                slippage: 0.5
              },
              rationale: 'Based on current market conditions, a direct swap on Cetus DEX offers the best price and lowest fees.'
            } : {})
          }
        },
        created_at: new Date(Date.now() + 5000).toISOString()
      };
      
      mockCommandResponses[newCommand.id] = response;
    }, 2000);
    
    return new Response(JSON.stringify({
      data: newCommand
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },
  
  /**
   * Get a mock ElizaOS command response
   */
  getCommandResponse: async (req: Request) => {
    const url = new URL(req.url);
    const commandId = url.searchParams.get('commandId');
    
    if (!commandId || !mockCommands[commandId]) {
      return new Response(JSON.stringify({
        error: 'Command not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // If response not ready yet
    if (!mockCommandResponses[commandId]) {
      return new Response(JSON.stringify({
        data: {
          status: 'PENDING',
          message: 'Command is still processing'
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      data: mockCommandResponses[commandId]
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  },
  
  /**
   * Get mock coordination state
   */
  getCoordinationState: async (req: Request) => {
    const url = new URL(req.url);
    const goalId = url.searchParams.get('goalId');
    
    if (goalId) {
      // Return specific goal coordination state
      if (!mockCoordinationStates[goalId]) {
        return new Response(JSON.stringify({
          error: 'Goal coordination state not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({
        data: mockCoordinationStates[goalId]
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return all goal coordination states
    return new Response(JSON.stringify({
      data: mockCoordinationStates
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
