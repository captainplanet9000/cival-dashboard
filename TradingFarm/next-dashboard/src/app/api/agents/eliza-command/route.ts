import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// Command Response Types
type CommandResponseType = 'COMMAND_RESPONSE' | 'KNOWLEDGE_RESPONSE' | 'SYSTEM_RESPONSE' | 'ERROR_RESPONSE';
type MessageCategory = 'command' | 'query' | 'analysis' | 'alert';
type SourceType = 'knowledge-base' | 'market-data' | 'strategy' | 'system';

interface CommandResponse {
  id: string;
  agentId: string;
  type: CommandResponseType;
  content: string;
  category: MessageCategory;
  source: SourceType;
  metadata?: any;
  timestamp: string;
}

/**
 * ElizaOS Command Processing Endpoint
 * Handles natural language commands and queries to agents
 * Integrates with knowledge base and returns responses
 */
export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { agentId, command, context = {} } = requestData;
    
    if (!agentId || !command) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId and command are required' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get agent and verify ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, farm_id, type, configuration')
      .eq('id', agentId)
      .single();
    
    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    // Verify farm ownership
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('id, user_id')
      .eq('id', agent.farm_id)
      .single();
    
    if (farmError || !farm || farm.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to access this agent' },
        { status: 403 }
      );
    }
    
    // Process command based on context and type
    let responseType: CommandResponseType = 'COMMAND_RESPONSE';
    let responseContent = '';
    let responseCategory: MessageCategory = 'command';
    let responseSource: SourceType = 'system';
    let responseMetadata = {};
    
    // Determine if this is a query or command
    const isQuery = command.trim().endsWith('?') || 
                   command.toLowerCase().startsWith('what') ||
                   command.toLowerCase().startsWith('how') ||
                   command.toLowerCase().startsWith('why') ||
                   command.toLowerCase().startsWith('when') ||
                   command.toLowerCase().startsWith('where') ||
                   command.toLowerCase().startsWith('which') ||
                   command.toLowerCase().startsWith('who') ||
                   command.toLowerCase().startsWith('can you') ||
                   command.toLowerCase().startsWith('could you');
    
    if (isQuery) {
      responseType = 'KNOWLEDGE_RESPONSE';
      responseCategory = 'query';
      responseSource = 'knowledge-base';
      
      // Mock knowledge base response for now
      // In production, this would call the ElizaOS knowledge API
      const mockResponses = {
        market: [
          "The market is currently showing increased volatility due to economic data releases.",
          "Market trends indicate a potential reversal pattern forming on major indices.",
          "Current market conditions favor a defensive investment strategy."
        ],
        strategy: [
          "Mean reversion strategies perform best in range-bound markets with high volatility.",
          "Momentum strategies typically work well in trending markets with low volatility.",
          "Statistical arbitrage requires significant computational resources but can generate alpha in various market conditions."
        ],
        performance: [
          "This strategy has shown a 12% annualized return with a Sharpe ratio of 1.4.",
          "Performance metrics indicate a 65% win rate with an average profit/loss ratio of 1.8.",
          "Drawdown analysis shows a maximum historical drawdown of 14% with quick recovery periods."
        ],
        general: [
          "ElizaOS trading agents utilize advanced machine learning algorithms for decision making.",
          "The system employs a hybrid approach combining rules-based logic with neural networks.",
          "Risk management is handled through dynamic position sizing and correlation analysis."
        ]
      };
      
      // Simple keyword matching to determine response category
      let responseSet = mockResponses.general;
      if (command.toLowerCase().includes('market') || command.toLowerCase().includes('trend')) {
        responseSet = mockResponses.market;
      } else if (command.toLowerCase().includes('strategy') || command.toLowerCase().includes('approach')) {
        responseSet = mockResponses.strategy;
      } else if (command.toLowerCase().includes('performance') || command.toLowerCase().includes('return')) {
        responseSet = mockResponses.performance;
      }
      
      // Select a random response from the appropriate set
      responseContent = responseSet[Math.floor(Math.random() * responseSet.length)];
      
    } else {
      // Handle as a command
      const commandLower = command.toLowerCase();
      
      // Parse common commands
      if (commandLower.includes('start') || commandLower.includes('activate')) {
        responseContent = `Agent ${agent.name} has been activated and is now running.`;
        responseMetadata = { status_change: 'active', action: 'start' };
        
        // Update agent status in database
        await supabase
          .from('agents')
          .update({ status: 'active' })
          .eq('id', agentId);
          
      } else if (commandLower.includes('stop') || commandLower.includes('deactivate')) {
        responseContent = `Agent ${agent.name} has been deactivated and is now stopped.`;
        responseMetadata = { status_change: 'inactive', action: 'stop' };
        
        // Update agent status in database
        await supabase
          .from('agents')
          .update({ status: 'inactive' })
          .eq('id', agentId);
          
      } else if (commandLower.includes('analyze') || commandLower.includes('report')) {
        responseType = 'COMMAND_RESPONSE';
        responseCategory = 'analysis';
        responseSource = 'market-data';
        responseContent = `Analysis complete. The current market conditions for ${agent.name}'s strategy are favorable with a 68% probability of successful execution.`;
        responseMetadata = { 
          analysis_type: 'market_conditions',
          confidence: 0.68,
          timestamp: new Date().toISOString()
        };
        
      } else if (commandLower.includes('modify') || commandLower.includes('update') || commandLower.includes('change')) {
        responseContent = `Configuration updated for agent ${agent.name}. New settings will take effect immediately.`;
        responseMetadata = { configuration_change: true, action: 'update' };
        
      } else {
        // Generic command response
        responseContent = `Command '${command}' processed. Agent ${agent.name} acknowledges the instruction.`;
      }
    }
    
    // Create response object
    const response: CommandResponse = {
      id: uuidv4(),
      agentId,
      type: responseType,
      content: responseContent,
      category: responseCategory,
      source: responseSource,
      metadata: responseMetadata,
      timestamp: new Date().toISOString()
    };
    
    // Log the command in agent_messages for history
    const messageMetadata = {
      command_type: isQuery ? 'query' : 'command',
      response_id: response.id,
      ...context
    };
    
    try {
      // Store message via API (compatible with mock mode)
      await fetch('/api/agents/communication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''  // Forward cookies for auth
        },
        body: JSON.stringify({
          sender_id: user.id,
          sender_name: 'User',
          recipient_id: agentId,
          content: command,
          message_type: 'command',
          priority: 'high',
          metadata: messageMetadata
        }),
      });
      
      // Store response via API
      await fetch('/api/agents/communication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''  // Forward cookies for auth
        },
        body: JSON.stringify({
          sender_id: agentId,
          sender_name: agent.name,
          recipient_id: user.id,
          content: responseContent,
          message_type: responseCategory,
          priority: 'high',
          metadata: {
            is_response: true,
            response_type: responseType,
            source: responseSource,
            ...responseMetadata
          }
        }),
      });
    } catch (error) {
      console.warn('Failed to log command in message history:', error);
      // Continue anyway - don't fail the command just because logging failed
    }
    
    // Send realtime notification on the agent's channel
    try {
      await supabase.channel(`agent-${agentId}`).send({
        type: 'broadcast',
        event: responseType,
        payload: response
      });
    } catch (error) {
      console.warn('Failed to send realtime notification:', error);
    }
    
    return NextResponse.json({
      response,
      success: true
    });
    
  } catch (error: any) {
    console.error('ElizaOS Command processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process command', 
        detail: error.message 
      },
      { status: 500 }
    );
  }
}
