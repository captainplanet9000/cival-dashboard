import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create supabase server client
    const supabase = await createServerClient();
    
    // ElizaOS integration features
    const elizaOSIntegration = {
      connected: true,
      status: 'active',
      capabilities: [
        'knowledge-retrieval',
        'trading-command-execution',
        'multi-agent-coordination',
        'strategy-optimization',
        'risk-assessment'
      ],
      availableModels: [
        { id: 'gpt-4', name: 'GPT-4', capabilities: ['trading-analysis', 'market-prediction'] },
        { id: 'claude-3', name: 'Claude 3', capabilities: ['strategy-optimization', 'risk-management'] }
      ],
      knowledgeBases: [
        { id: 'market-data', name: 'Market Analysis', documentCount: 156 },
        { id: 'trading-strategies', name: 'Strategy Library', documentCount: 83 },
        { id: 'risk-models', name: 'Risk Management', documentCount: 42 }
      ]
    };
    
    const mockDashboardData = {
      userId: userId,
      farms: [
        {
          id: 'farm-1',
          name: 'Bitcoin Trading Farm',
          description: 'Automated Bitcoin trading strategies',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metrics: {
            portfolioValue: 124500.75,
            dailyChange: 2.3,
            activeAgents: 3,
            totalTrades: 142,
            profitableTrades: 98
          },
          elizaOS: {
            connected: true,
            agentCount: 3,
            lastSync: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            knowledgeBase: 'trading-strategies'
          }
        },
        {
          id: 'farm-2',
          name: 'Ethereum Yield Strategy',
          description: 'Yield optimization for Ethereum assets',
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          metrics: {
            portfolioValue: 87250.25,
            dailyChange: -0.8,
            activeAgents: 2,
            totalTrades: 93,
            profitableTrades: 61
          },
          elizaOS: {
            connected: true,
            agentCount: 2,
            lastSync: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            knowledgeBase: 'risk-models'
          }
        }
      ],
      agents: [
        {
          id: 'agent-1',
          name: 'BTC Momentum Trader',
          farmId: 'farm-1',
          status: 'active',
          strategy: 'momentum',
          metrics: {
            profit: 12.5,
            trades: 47,
            winRate: 0.72
          },
          elizaOS: {
            model: 'gpt-4',
            memory: {
              contextSize: 8192,
              persistentMemories: 38,
              recentInteractions: 124
            },
            capabilities: ['market-analysis', 'trade-execution', 'risk-monitoring']
          }
        },
        {
          id: 'agent-2',
          name: 'ETH Grid Bot',
          farmId: 'farm-1',
          status: 'active',
          strategy: 'grid',
          metrics: {
            profit: 8.3,
            trades: 56,
            winRate: 0.68
          },
          elizaOS: {
            model: 'claude-3',
            memory: {
              contextSize: 12000,
              persistentMemories: 42,
              recentInteractions: 86
            },
            capabilities: ['grid-optimization', 'volatility-analysis', 'execution-quality']
          }
        },
        {
          id: 'agent-3',
          name: 'Mean Reversion Algo',
          farmId: 'farm-1',
          status: 'active',
          strategy: 'mean-reversion',
          metrics: {
            profit: 5.1,
            trades: 39,
            winRate: 0.64
          },
          elizaOS: {
            model: 'gpt-4',
            memory: {
              contextSize: 8192,
              persistentMemories: 29,
              recentInteractions: 73
            },
            capabilities: ['statistical-analysis', 'pattern-recognition', 'adaptive-parameters']
          }
        },
        {
          id: 'agent-4',
          name: 'ETH Yield Optimizer',
          farmId: 'farm-2',
          status: 'active',
          strategy: 'yield',
          metrics: {
            profit: 6.2,
            trades: 28,
            winRate: 0.82
          },
          elizaOS: {
            model: 'claude-3',
            memory: {
              contextSize: 12000,
              persistentMemories: 34,
              recentInteractions: 62
            },
            capabilities: ['defi-integration', 'yield-comparison', 'gas-optimization']
          }
        },
        {
          id: 'agent-5',
          name: 'Arbitrage Scanner',
          farmId: 'farm-2',
          status: 'active',
          strategy: 'arbitrage',
          metrics: {
            profit: 4.8,
            trades: 65,
            winRate: 0.55
          },
          elizaOS: {
            model: 'gpt-4',
            memory: {
              contextSize: 8192,
              persistentMemories: 21,
              recentInteractions: 108
            },
            capabilities: ['cross-exchange-analysis', 'latency-compensation', 'opportunity-ranking']
          }
        }
      ],
      riskMetrics: {
        portfolioRisk: {
          var95: 4250.50,
          maxDrawdown: 8500.25,
          sharpeRatio: 1.72
        },
        marketState: {
          btcVolatility: 2.4,
          ethVolatility: 3.1,
          marketCondition: 'bullish'
        },
        elizaOS: {
          riskAssessment: 'moderate',
          confidenceScore: 0.82,
          marketSentiment: 'positive',
          aiRecommendations: [
            { action: 'reduce-btc-exposure', confidence: 0.68, reason: 'increasing volatility' },
            { action: 'increase-stablecoin-allocation', confidence: 0.75, reason: 'prepare for market correction' }
          ]
        }
      },
      recentOrders: [
        {
          id: 'order-1',
          symbol: 'BTC/USD',
          type: 'market',
          side: 'buy',
          amount: 0.25,
          price: 64250.50,
          status: 'filled',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          elizaOS: {
            agentId: 'agent-1',
            reasoning: 'Bullish momentum pattern detected, RSI indicating oversold condition',
            confidence: 0.87
          }
        },
        {
          id: 'order-2',
          symbol: 'ETH/USD',
          type: 'limit',
          side: 'sell',
          amount: 1.5,
          price: 3450.75,
          status: 'open',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          elizaOS: {
            agentId: 'agent-4',
            reasoning: 'Taking profit at resistance level, yield farming opportunity identified',
            confidence: 0.78
          }
        },
        {
          id: 'order-3',
          symbol: 'SOL/USD',
          type: 'market',
          side: 'buy',
          amount: 5.0,
          price: 120.25,
          status: 'filled',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          elizaOS: {
            agentId: 'agent-3',
            reasoning: 'Mean reversion signal triggered after 15% deviation from 20-day moving average',
            confidence: 0.82
          }
        }
      ],
      elizaOS: elizaOSIntegration
    };

    // Return the response with proper headers
    return new NextResponse(JSON.stringify(mockDashboardData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    // Ensure we return a detailed error object instead of empty {}
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to fetch dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString() 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
