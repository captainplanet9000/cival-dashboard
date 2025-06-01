import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * ElizaOS Agent Messages API
 * Handles agent-user messaging and command processing
 */

// Message category types
type MessageCategoryType = 
  | 'command'       // Execution command
  | 'query'         // Information query
  | 'analysis'      // Data analysis
  | 'alert'         // Important notification
  | 'status';       // Status update

// Message source types
type MessageSourceType = 
  | 'knowledge-base'
  | 'market-data'
  | 'strategy'
  | 'system'
  | 'user'
  | 'tool'
  | 'exchange';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const agentId = params.id;
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Fetch messages
    const { data: messages, error } = await supabase
      .from('agent_messages')
      .select('*')
      .eq('agent_id', agentId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching agent messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agent messages' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Unexpected error in ElizaOS messages GET:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const agentId = params.id;
    const body = await request.json();
    
    // Validate message structure
    const { 
      message, 
      category = 'query', 
      context = {} 
    } = body;
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message content is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Get the agent to verify it exists and check its configuration
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
    
    // Determine if this is a command or a general message
    const isCommand = category === 'command' || message.startsWith('/');
    
    // Store the user message
    const { data: userMessage, error: messageError } = await supabase
      .from('agent_messages')
      .insert({
        agent_id: agentId,
        content: message,
        role: 'user',
        source: 'user',
        category: isCommand ? 'command' : category,
        timestamp: new Date().toISOString(),
        metadata: context
      })
      .select()
      .single();
    
    if (messageError) {
      console.error('Error storing user message:', messageError);
      return NextResponse.json(
        { error: 'Failed to store user message' },
        { status: 500 }
      );
    }
    
    // Generate agent response
    let responseContent = '';
    let responseCategory: MessageCategoryType = 'query';
    let responseSource: MessageSourceType = 'system';
    let responseMetadata = {};
    
    if (isCommand) {
      // Process as command
      const commandText = message.startsWith('/') ? message.substring(1) : message;
      
      // Call the command endpoint
      const commandResponse = await fetch(
        `${request.nextUrl.origin}/api/agents/${agentId}/eliza/command`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            command: commandText,
            context
          })
        }
      );
      
      if (!commandResponse.ok) {
        responseContent = 'Error processing command. Please try again.';
      } else {
        const commandResult = await commandResponse.json();
        
        if (commandResult.commandResult?.success) {
          // Format successful command result
          responseContent = `Command executed successfully.\n\n`;
          
          if (commandResult.commandResult.data) {
            const data = commandResult.commandResult.data;
            responseMetadata = data;
            
            // Format data based on content
            if (data.analysis) {
              responseContent += `Market Analysis for ${data.market}:\n`;
              responseContent += `• Trend: ${data.analysis.trend}\n`;
              responseContent += `• Support: ${data.analysis.support}\n`;
              responseContent += `• Resistance: ${data.analysis.resistance}\n`;
              responseContent += `• 24h Volume: ${data.analysis.volume_24h}\n`;
              responseContent += `• Recommendation: ${data.analysis.recommendation}`;
              responseCategory = 'analysis';
              responseSource = 'market-data';
            } 
            else if (data.order_id) {
              responseContent += `Trade order placed:\n`;
              responseContent += `• Order ID: ${data.order_id}\n`;
              responseContent += `• Action: ${data.action.toUpperCase()}\n`;
              responseContent += `• Symbol: ${data.symbol}\n`;
              responseContent += `• Amount: ${data.amount}\n`;
              responseContent += `• Price: ${data.price}\n`;
              responseContent += `• Status: ${data.status}`;
              responseCategory = 'command';
              responseSource = 'exchange';
            } 
            else if (data.balances) {
              responseContent += `Account Balances:\n`;
              Object.entries(data.balances).forEach(([currency, amount]) => {
                responseContent += `• ${currency}: ${amount}\n`;
              });
              responseCategory = 'query';
              responseSource = 'exchange';
            } 
            else if (data.symbol && data.price) {
              responseContent += `Market Data for ${data.symbol}:\n`;
              responseContent += `• Current Price: ${data.price}\n`;
              responseContent += `• 24h Change: ${data.change_24h}\n`;
              responseContent += `• 24h High: ${data.high_24h}\n`;
              responseContent += `• 24h Low: ${data.low_24h}\n`;
              responseContent += `• 24h Volume: ${data.volume_24h}`;
              responseCategory = 'analysis';
              responseSource = 'market-data';
            } 
            else if (data.positions) {
              responseContent += `Current Positions:\n`;
              data.positions.forEach((position, index) => {
                responseContent += `Position ${index + 1}:\n`;
                responseContent += `• Symbol: ${position.symbol}\n`;
                responseContent += `• Size: ${position.size}\n`;
                responseContent += `• Entry Price: ${position.entry_price}\n`;
                responseContent += `• Current Price: ${position.current_price}\n`;
                responseContent += `• PnL: ${position.pnl} (${position.pnl_percentage})\n`;
              });
              responseCategory = 'query';
              responseSource = 'exchange';
            } 
            else if (data.available_commands) {
              responseContent = `Available Commands:\n\n`;
              data.available_commands.forEach((cmd: string) => {
                responseContent += `${cmd}\n`;
              });
              
              if (data.equipped_tools && data.equipped_tools.length) {
                responseContent += `\nEquipped Tools: ${data.equipped_tools.join(', ')}`;
              }
              
              responseCategory = 'query';
              responseSource = 'system';
            } 
            else {
              // Generic data formatting
              responseContent += `Result:\n`;
              responseContent += JSON.stringify(data, null, 2);
            }
          }
        } else {
          // Failed command
          responseContent = `Command failed: ${commandResult.commandResult?.error || 'Unknown error'}`;
          responseCategory = 'alert';
          responseSource = 'system';
          responseMetadata = { error: commandResult.commandResult?.error };
        }
      }
    } else {
      // Process as general message/query
      // Check if agent has LLM access
      const llmConfigId = agent.llm_config_id;
      const toolsConfig = agent.tools_config || {};
      
      if (llmConfigId && toolsConfig.llm_enabled) {
        // Get LLM configuration
        const { data: llmConfig, error: llmConfigError } = await supabase
          .from('llm_configs')
          .select('*')
          .eq('id', llmConfigId)
          .single();
        
        if (llmConfigError) {
          console.error('Error fetching LLM config:', llmConfigError);
          responseContent = "I'm unable to process your message right now. Please try again later.";
        } else {
          // In a real implementation, you would call the actual LLM API here
          // For now, we'll simulate a response
          responseContent = await simulateLLMResponse(message, agent, category);
          responseSource = 'knowledge-base';
        }
      } else {
        // No LLM access, provide a basic response
        if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
          responseContent = `Hello! I'm ${agent.name}, your trading assistant. I can help you with market analysis, placing trades, and checking your account. Type /help to see available commands.`;
        } else if (message.toLowerCase().includes('trade') || message.toLowerCase().includes('buy') || message.toLowerCase().includes('sell')) {
          responseContent = `To execute a trade, please use the command format: /trade [buy/sell] [symbol] [amount]`;
          responseCategory = 'command';
        } else if (message.toLowerCase().includes('market') || message.toLowerCase().includes('price')) {
          responseContent = `To check market data, please use the command format: /market [symbol]`;
          responseCategory = 'command';
        } else if (message.toLowerCase().includes('balance') || message.toLowerCase().includes('account')) {
          responseContent = `To check your account balance, please use the command: /balance`;
          responseCategory = 'command';
        } else if (message.toLowerCase().includes('help')) {
          responseContent = `Type /help to see available commands and tools.`;
          responseCategory = 'command';
        } else {
          responseContent = `I don't understand that query. Type /help to see what I can do.`;
          responseCategory = 'query';
        }
      }
    }
    
    // Store the agent response
    const { data: agentResponse, error: responseError } = await supabase
      .from('agent_messages')
      .insert({
        agent_id: agentId,
        content: responseContent,
        role: 'agent',
        source: responseSource,
        category: responseCategory,
        timestamp: new Date().toISOString(),
        metadata: responseMetadata
      })
      .select()
      .single();
    
    if (responseError) {
      console.error('Error storing agent response:', responseError);
      return NextResponse.json(
        { error: 'Failed to store agent response' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      message: userMessage,
      response: agentResponse 
    });
  } catch (error) {
    console.error('Unexpected error in ElizaOS messages POST:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Simulate LLM response for demo purposes
 * In production, this would be replaced with actual LLM API calls
 */
async function simulateLLMResponse(message: string, agent: any, category: string): Promise<string> {
  // Simple response templates based on message content
  if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
    return `Hello! I'm ${agent.name}, your intelligent trading assistant powered by ElizaOS. How can I help you today?`;
  }
  
  if (message.toLowerCase().includes('market') || message.toLowerCase().includes('price')) {
    return `Based on my analysis, the market is showing mixed signals right now. Bitcoin is testing key resistance levels around $27,400, with increased volume indicating potential breakout momentum. Ethereum has shown relative strength compared to other altcoins, maintaining support above $1,800. \n\nUse the /market command for specific symbol data or /analyze for a detailed technical analysis.`;
  }
  
  if (message.toLowerCase().includes('trade') || message.toLowerCase().includes('strategy')) {
    return `Your current trading strategy focuses on ${agent.strategy_type || 'momentum trading'} with a ${agent.risk_level || 'moderate'} risk profile. Based on recent market conditions, I recommend focusing on assets with high liquidity and clear trend patterns. \n\nTo execute trades based on this strategy, use the /trade command followed by the action, symbol, and amount.`;
  }
  
  if (message.toLowerCase().includes('performance') || message.toLowerCase().includes('profit')) {
    return `Your trading performance over the last 30 days shows a ${Math.random() > 0.5 ? 'profit' : 'loss'} of ${(Math.random() * 15).toFixed(2)}%. Win rate is approximately ${Math.floor(40 + Math.random() * 30)}% across ${Math.floor(10 + Math.random() * 20)} trades. The average trade duration is ${Math.floor(2 + Math.random() * 10)} hours. \n\nUse the /performance command for detailed metrics and analysis.`;
  }
  
  if (message.toLowerCase().includes('risk') || message.toLowerCase().includes('safety')) {
    return `Your current risk level is set to ${agent.risk_level || 'moderate'}. This corresponds to a maximum position size of ${Math.floor(5 + Math.random() * 10)}% of your portfolio per trade, with stop losses at ${Math.floor(2 + Math.random() * 5)}% from entry. \n\nTo adjust your risk parameters, use the /risk command followed by the desired level (low, moderate, high).`;
  }
  
  if (message.toLowerCase().includes('news') || message.toLowerCase().includes('sentiment')) {
    return `Recent market sentiment is ${Math.random() > 0.5 ? 'bullish' : 'bearish'} based on analysis of news sources and social media. Key topics driving the market include regulatory developments, macroeconomic factors, and technological advancements in the blockchain space. \n\nUse the /news command for the latest headlines or /sentiment for detailed sentiment analysis.`;
  }
  
  // Default response
  return `I understand you're asking about "${message}". To provide the most accurate information, could you use one of my specialized commands? Type /help to see all available commands.`;
}
