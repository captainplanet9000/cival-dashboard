import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * ElizaOS Agent Command API
 * Handles command execution for ElizaOS agents
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const agentId = params.id;
    const body = await request.json();
    
    // Extract command and context from request
    const { command, context = {} } = body;
    
    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { error: 'Command is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Get the agent to verify it exists and check its tools
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*, farms(*)')
      .eq('id', agentId)
      .single();
    
    if (agentError || !agent) {
      console.error('Error fetching agent:', agentError);
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Get equipped tools to determine command capabilities
    const { data: equippedTools, error: toolsError } = await supabase
      .from('agent_equipped_tools')
      .select(`
        id,
        tool_id,
        is_active,
        agent_tools (
          id,
          name,
          tool_type,
          config
        )
      `)
      .eq('agent_id', agentId)
      .eq('is_active', true);
    
    if (toolsError) {
      console.error('Error fetching agent tools:', toolsError);
      return NextResponse.json(
        { error: 'Failed to fetch agent tools' },
        { status: 500 }
      );
    }
    
    // Map of available command types based on equipped tools
    const availableCommandTypes = new Set<string>();
    
    equippedTools?.forEach(tool => {
      if (tool.agent_tools?.tool_type) {
        availableCommandTypes.add(tool.agent_tools.tool_type);
      }
    });
    
    // Extract command type for processing (first word, lowercase)
    const commandType = command.split(' ')[0].toLowerCase();
    
    // Record the command in the agent activity log
    const { error: activityError } = await supabase
      .from('agent_activity')
      .insert({
        agent_id: agentId,
        action: 'command',
        details: {
          command,
          context
        }
      });
    
    if (activityError) {
      console.error('Error recording command activity:', activityError);
      // Non-blocking, continue execution
    }
    
    // Process different command types
    let commandResult: any = null;
    
    // Simple command processor - in production, this would be much more sophisticated
    // with NLP parsing, command registry, etc.
    
    if (commandType === 'help') {
      // Help command always available
      commandResult = {
        success: true,
        data: {
          available_commands: [
            "help - Show this help message",
            "analyze {market} - Analyze a market (requires analytics tool)",
            "trade {action} {symbol} {amount} - Execute a trade (requires exchange tool)",
            "balance - Check account balance (requires exchange tool)",
            "market {symbol} - Get market data (requires analytics tool)",
            "position - View current positions (requires exchange tool)"
          ],
          equipped_tools: Array.from(availableCommandTypes)
        }
      };
    } 
    else if (commandType === 'analyze' && availableCommandTypes.has('analytics')) {
      // Mock market analysis command
      const market = command.split(' ')[1] || 'BTC/USD';
      commandResult = {
        success: true,
        data: {
          market,
          analysis: {
            trend: Math.random() > 0.5 ? 'bullish' : 'bearish',
            support: Math.floor(20000 + Math.random() * 1000),
            resistance: Math.floor(21000 + Math.random() * 1000),
            volume_24h: Math.floor(1000000 + Math.random() * 500000),
            recommendation: Math.random() > 0.6 ? 'buy' : 'hold'
          }
        }
      };
    } 
    else if (commandType === 'trade' && availableCommandTypes.has('exchange')) {
      // Extract trade parameters
      const parts = command.split(' ');
      const action = parts[1]?.toLowerCase();
      const symbol = parts[2]?.toUpperCase();
      const amount = parseFloat(parts[3] || '0');
      
      // Validate trade permissions
      const tradingPermissions = agent.trading_permissions || {};
      const allowedExchanges = tradingPermissions.exchanges || [];
      
      if (allowedExchanges.length === 0) {
        commandResult = {
          success: false,
          error: 'This agent does not have permission to trade on any exchange'
        };
      } 
      else if (!action || !['buy', 'sell'].includes(action)) {
        commandResult = {
          success: false,
          error: 'Invalid trade action, must be "buy" or "sell"'
        };
      } 
      else if (!symbol) {
        commandResult = {
          success: false,
          error: 'Symbol is required for trade commands'
        };
      } 
      else if (isNaN(amount) || amount <= 0) {
        commandResult = {
          success: false,
          error: 'Valid amount is required for trade commands'
        };
      } 
      else {
        // Mock trade execution
        commandResult = {
          success: true,
          data: {
            order_id: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            action,
            symbol,
            amount,
            price: Math.floor(20000 + Math.random() * 1000),
            status: 'submitted',
            timestamp: new Date().toISOString()
          }
        };
      }
    } 
    else if (commandType === 'balance' && availableCommandTypes.has('exchange')) {
      // Mock balance command
      commandResult = {
        success: true,
        data: {
          balances: {
            BTC: Math.random().toFixed(8),
            ETH: (Math.random() * 10).toFixed(8),
            USDT: (Math.random() * 10000).toFixed(2)
          }
        }
      };
    } 
    else if (commandType === 'market' && availableCommandTypes.has('analytics')) {
      // Extract market symbol
      const symbol = command.split(' ')[1]?.toUpperCase() || 'BTC/USD';
      
      // Mock market data
      commandResult = {
        success: true,
        data: {
          symbol,
          price: Math.floor(20000 + Math.random() * 1000),
          change_24h: (Math.random() * 10 - 5).toFixed(2) + '%',
          high_24h: Math.floor(20000 + Math.random() * 2000),
          low_24h: Math.floor(20000 - Math.random() * 1000),
          volume_24h: Math.floor(1000000 + Math.random() * 500000)
        }
      };
    } 
    else if (commandType === 'position' && availableCommandTypes.has('exchange')) {
      // Mock position data
      commandResult = {
        success: true,
        data: {
          positions: [
            {
              symbol: 'BTC/USD',
              size: (Math.random() * 2).toFixed(8),
              entry_price: Math.floor(20000 + Math.random() * 1000),
              current_price: Math.floor(20000 + Math.random() * 1000),
              pnl: (Math.random() * 1000 - 500).toFixed(2),
              pnl_percentage: (Math.random() * 20 - 10).toFixed(2) + '%'
            }
          ]
        }
      };
    } 
    else {
      // Unknown or unavailable command
      commandResult = {
        success: false,
        error: `Command '${commandType}' is not recognized or the required tools are not equipped`,
        context: {
          available_command_types: Array.from(availableCommandTypes)
        }
      };
    }
    
    // Store the command result in the database
    if (commandResult) {
      const { error: resultError } = await supabase
        .from('agent_command_results')
        .insert({
          agent_id: agentId,
          command,
          result: commandResult,
          created_at: new Date().toISOString()
        });
      
      if (resultError) {
        console.error('Error storing command result:', resultError);
        // Non-blocking, continue returning the result
      }
    }
    
    return NextResponse.json({ commandResult });
  } catch (error) {
    console.error('Unexpected error in ElizaOS command execution:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during command execution' },
      { status: 500 }
    );
  }
}
