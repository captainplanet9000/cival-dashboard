import { supabase } from '../../src/integrations/supabase/client';

/**
 * Seed script for ElizaOS integration tables
 * 
 * This script creates sample data for:
 * - ElizaOS commands
 * - Memory items
 * 
 * Run using: npx ts-node database/seed/elizaos-seed.ts
 */
async function seedElizaOSData() {
  console.log('Starting ElizaOS integration data seeding...');
  
  try {
    // Get first user from auth.users table to use as agent
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1);
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return;
    }
    
    const agentId = users && users.length > 0 ? users[0].id : null;
    
    if (!agentId) {
      console.error('No users found in auth.users table. Please create a user first.');
      return;
    }
    
    // Sample ElizaOS commands
    const commands = [
      {
        command: 'Analyze BTC/USD market trend for the last 7 days',
        source: 'user',
        agent_id: agentId,
        context: { timeframe: '7d', market: 'BTC/USD' },
        status: 'completed',
        response: {
          analysis: 'BTC/USD has shown a bullish trend over the past week with support at $60,000.',
          recommendation: 'Consider entering long positions with tight stop-loss.',
          confidence: 0.78
        },
        completed_at: new Date(Date.now() - 86400000).toISOString(),
        processing_time_ms: 1250
      },
      {
        command: 'Set up a price alert for ETH/USD at $3,500',
        source: 'user',
        agent_id: agentId,
        context: { price: 3500, market: 'ETH/USD', direction: 'above' },
        status: 'completed',
        response: {
          message: 'Price alert created successfully.',
          alert_id: 'eth-alert-001',
          details: 'You will be notified when ETH/USD crosses $3,500'
        },
        completed_at: new Date(Date.now() - 172800000).toISOString(),
        processing_time_ms: 890
      },
      {
        command: 'What is my current portfolio allocation?',
        source: 'user',
        agent_id: agentId,
        context: { portfolio_id: 'main-portfolio' },
        status: 'completed',
        response: {
          allocation: {
            'BTC': 40,
            'ETH': 25,
            'SOL': 15,
            'USDC': 20
          },
          total_value: 25450.75,
          currency: 'USD'
        },
        completed_at: new Date(Date.now() - 259200000).toISOString(),
        processing_time_ms: 1100
      },
      {
        command: 'Execute limit order for SOL/USD: sell 10 SOL at $150',
        source: 'user',
        agent_id: agentId,
        context: { 
          market: 'SOL/USD', 
          side: 'sell', 
          quantity: 10, 
          price: 150, 
          order_type: 'limit' 
        },
        status: 'completed',
        response: {
          order_id: 'ord-sol-89345',
          message: 'Limit order placed successfully.',
          estimated_execution: 'Order will execute when SOL/USD reaches $150'
        },
        completed_at: new Date(Date.now() - 345600000).toISOString(),
        processing_time_ms: 1450
      },
      {
        command: 'Show my trading performance for March 2023',
        source: 'user',
        agent_id: agentId,
        context: { 
          time_period: 'month', 
          month: 'March', 
          year: 2023 
        },
        status: 'completed',
        response: {
          pnl: 1850.25,
          roi: 7.2,
          currency: 'USD',
          best_performing: 'BTC/USD',
          worst_performing: 'ADA/USD',
          total_trades: 28
        },
        completed_at: new Date(Date.now() - 432000000).toISOString(),
        processing_time_ms: 1680
      }
    ];
    
    // Insert ElizaOS commands
    for (const cmd of commands) {
      const { data, error } = await supabase
        .from('eliza_commands')
        .insert({
          command: cmd.command,
          source: cmd.source,
          agent_id: cmd.agent_id,
          context: cmd.context,
          response: cmd.response,
          status: cmd.status,
          completed_at: cmd.completed_at,
          processing_time_ms: cmd.processing_time_ms
        });
      
      if (error) {
        console.error(`Error creating ElizaOS command: ${cmd.command}`, error);
      } else {
        console.log(`Created ElizaOS command: ${cmd.command}`);
      }
    }
    
    // Sample memory items
    const memories = [
      {
        agent_id: agentId,
        content: 'BTC/USD broke through resistance at $65,000 with high volume',
        type: 'observation',
        importance: 8,
        metadata: {
          market: 'BTC/USD',
          price: 65250,
          volume: 124500000,
          timestamp: new Date(Date.now() - 86400000).toISOString()
        }
      },
      {
        agent_id: agentId,
        content: 'Entered long position on ETH/USD at $3,200 with 2x leverage',
        type: 'decision',
        importance: 9,
        metadata: {
          market: 'ETH/USD',
          entry_price: 3200,
          position_size: 5,
          leverage: 2,
          timestamp: new Date(Date.now() - 172800000).toISOString()
        }
      },
      {
        agent_id: agentId,
        content: 'SOL/USD showing bearish divergence on 4h chart',
        type: 'observation',
        importance: 7,
        metadata: {
          market: 'SOL/USD',
          timeframe: '4h',
          indicator: 'RSI',
          timestamp: new Date(Date.now() - 259200000).toISOString()
        }
      },
      {
        agent_id: agentId,
        content: 'User prefers conservative position sizing of max 5% per trade',
        type: 'feedback',
        importance: 10,
        metadata: {
          preference_type: 'risk_management',
          source: 'user_feedback',
          timestamp: new Date(Date.now() - 345600000).toISOString()
        }
      },
      {
        agent_id: agentId,
        content: 'Profit target of 15% reached on BTC/USD long position',
        type: 'observation',
        importance: 8,
        metadata: {
          market: 'BTC/USD',
          profit_percentage: 15,
          position_id: 'pos-btc-1234',
          timestamp: new Date(Date.now() - 432000000).toISOString()
        }
      },
      {
        agent_id: agentId,
        content: 'Closed ETH/USD position at $3,450 for 7.8% profit',
        type: 'decision',
        importance: 8,
        metadata: {
          market: 'ETH/USD',
          exit_price: 3450,
          entry_price: 3200,
          profit_percentage: 7.8,
          position_id: 'pos-eth-5678',
          timestamp: new Date(Date.now() - 518400000).toISOString()
        }
      },
      {
        agent_id: agentId,
        content: 'Market pattern: BTC leads market movements, altcoins follow after 12-24 hours',
        type: 'insight',
        importance: 9,
        metadata: {
          pattern_type: 'market_correlation',
          confidence: 0.85,
          observed_occurrences: 12,
          timestamp: new Date(Date.now() - 604800000).toISOString()
        }
      }
    ];
    
    // Insert memory items
    for (const memory of memories) {
      const { data, error } = await supabase
        .from('memory_items')
        .insert({
          agent_id: memory.agent_id,
          content: memory.content,
          type: memory.type,
          importance: memory.importance,
          metadata: memory.metadata
        });
      
      if (error) {
        console.error(`Error creating memory item: ${memory.content}`, error);
      } else {
        console.log(`Created memory item: ${memory.content}`);
      }
    }
    
    console.log('ElizaOS data seeding completed');
  } catch (error) {
    console.error('Error seeding ElizaOS data:', error);
  }
}

// Run the seed function
seedElizaOSData(); 