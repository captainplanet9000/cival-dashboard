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

    // Create supabase server client with proper error handling
    let supabase;
    try {
      supabase = await createServerClient();
    } catch (error) {
      console.error('Error creating Supabase client:', error);
      // Continue with mock data if database connection fails
    }
    
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
          status: 'active',
          metrics: {
            totalProfit: 12580.45,
            profitLast24h: 345.21,
            profitLast7d: 2245.87,
            tradeCount: 178,
            successRate: 0.68,
            avgHoldingTime: '3.2h'
          },
          exchanges: [
            { name: 'Binance', status: 'connected', apiKeyLastFour: '7X92' },
            { name: 'Coinbase', status: 'connected', apiKeyLastFour: '3F21' }
          ],
          agents: [
            {
              id: 'agent-1',
              name: 'BTC Momentum Trader',
              status: 'active',
              type: 'momentum',
              metrics: {
                profit: 8752.34,
                trades: 124,
                successRate: 0.72
              },
              elizaIntegration: true
            },
            {
              id: 'agent-2',
              name: 'ETH Swing Trader',
              status: 'active',
              type: 'swing',
              metrics: {
                profit: 3828.11,
                trades: 54,
                successRate: 0.65
              },
              elizaIntegration: true
            }
          ],
          strategies: [
            {
              id: 'strategy-1',
              name: 'BTC Momentum Strategy',
              description: 'Momentum trading for Bitcoin',
              asset: 'BTC',
              type: 'momentum',
              parameters: {
                entryThreshold: 0.05,
                exitThreshold: 0.03,
                stopLoss: 0.02
              },
              performance: {
                returnRate: 0.18,
                drawdown: 0.08,
                sharpeRatio: 1.6
              }
            },
            {
              id: 'strategy-2',
              name: 'ETH Swing Strategy',
              description: 'Swing trading for Ethereum',
              asset: 'ETH',
              type: 'swing',
              parameters: {
                lowerBound: 0.08,
                upperBound: 0.12,
                holdingPeriod: '24h'
              },
              performance: {
                returnRate: 0.22,
                drawdown: 0.11,
                sharpeRatio: 1.4
              }
            }
          ],
          positions: [
            {
              id: 'position-1',
              asset: 'BTC',
              type: 'long',
              entryPrice: 57250.25,
              currentPrice: 58975.50,
              size: 0.5,
              pnl: 862.63,
              pnlPercentage: 0.03,
              openTime: new Date().toISOString()
            },
            {
              id: 'position-2',
              asset: 'ETH',
              type: 'long',
              entryPrice: 3120.75,
              currentPrice: 3345.80,
              size: 3.2,
              pnl: 721.60,
              pnlPercentage: 0.07,
              openTime: new Date().toISOString()
            }
          ],
          recentOrders: [
            {
              id: 'order-1',
              asset: 'BTC',
              type: 'market',
              side: 'buy',
              price: 57250.25,
              size: 0.5,
              status: 'filled',
              createdAt: new Date(Date.now() - 3600000).toISOString()
            },
            {
              id: 'order-2',
              asset: 'ETH',
              type: 'market',
              side: 'buy',
              price: 3120.75,
              size: 3.2,
              status: 'filled',
              createdAt: new Date(Date.now() - 7200000).toISOString()
            }
          ],
          goals: [
            {
              id: 'goal-1',
              name: 'Monthly BTC Accumulation',
              target: 0.1,
              current: 0.08,
              deadline: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
              status: 'in-progress'
            },
            {
              id: 'goal-2',
              name: 'Q2 Profit Target',
              target: 25000,
              current: 12580.45,
              deadline: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
              status: 'in-progress'
            }
          ],
          elizaOS: elizaOSIntegration
        }
      ],
      marketSummary: {
        btc: {
          price: 58975.50,
          change24h: 0.025,
          volume24h: 32500000000
        },
        eth: {
          price: 3345.80,
          change24h: 0.038,
          volume24h: 18700000000
        },
        marketCap: {
          total: 2350000000000,
          change24h: 0.032
        },
        fear_greed_index: {
          value: 72,
          status: 'greed'
        }
      },
      notifications: [
        {
          id: 'notification-1',
          type: 'trade',
          content: 'BTC Momentum Trader opened a long position',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          read: false
        },
        {
          id: 'notification-2',
          type: 'alert',
          content: 'BTC price increased by 5% in the last hour',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          read: true
        },
        {
          id: 'notification-3',
          type: 'system',
          content: 'ElizaOS connection established',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          read: true
        }
      ],
      elizaOS: elizaOSIntegration
    };

    // Database integration would happen here in production
    // For demo purposes, we're returning mock data
    return NextResponse.json(mockDashboardData);
  } catch (error) {
    console.error('Error in dashboard API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
