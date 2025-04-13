import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { getBrainAssetById, downloadBrainAsset } from './brain-assets';
import { logExecutionEvent, recordStrategySignal, addExecutionMessage } from './strategy-execution';

// Types for ElizaOS integration
export interface ElizaCommand {
  command: string;
  type: 'query' | 'action' | 'analysis' | 'chat';
  params?: Record<string, any>;
  contextId?: string;
  source?: string;
}

export interface ElizaResponse {
  message: string;
  type: 'text' | 'json' | 'error';
  data?: any;
  source?: string;
  metadata?: Record<string, any>;
}

export interface AgentInstruction {
  id: number;
  agent_id: number;
  title: string;
  content: string;
  priority: number;
  active: boolean;
  type: 'system' | 'user' | 'goal' | 'constraint' | 'procedure';
  created_at: string;
  updated_at: string;
}

export interface AgentContext {
  agentId: number;
  executionId?: number;
  symbol?: string;
  timeframe?: string;
  strategy?: any;
  brainAssets?: any[];
  metadata?: Record<string, any>;
}

/**
 * Send a command to ElizaOS for processing
 */
export async function sendElizaCommand(
  command: ElizaCommand,
  context: AgentContext
): Promise<ElizaResponse> {
  try {
    // In a real implementation, this would connect to ElizaOS via WebSockets or API
    // For now, we'll simulate a response based on the command
    console.log('Sending command to ElizaOS:', command, context);
    
    // Log the command if we have an execution context
    if (context.executionId) {
      await logExecutionEvent(
        context.executionId,
        'info',
        `Command sent to ElizaOS: ${command.command}`,
        'eliza',
        { command }
      );
    }
    
    // Process different command types
    if (command.type === 'query') {
      return await processElizaQuery(command, context);
    } else if (command.type === 'action') {
      return await processElizaAction(command, context);
    } else if (command.type === 'analysis') {
      return await processElizaAnalysis(command, context);
    } else {
      // Default chat response
      return {
        message: `I've received your message: "${command.command}". How can I help with your trading strategy?`,
        type: 'text',
        source: 'eliza',
      };
    }
  } catch (error) {
    console.error('Error sending command to ElizaOS:', error);
    return {
      message: `Error processing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
      type: 'error',
    };
  }
}

/**
 * Process a query command
 */
async function processElizaQuery(
  command: ElizaCommand,
  context: AgentContext
): Promise<ElizaResponse> {
  const queryLower = command.command.toLowerCase();
  
  // Simple keyword matching for now
  if (queryLower.includes('market') && queryLower.includes('data')) {
    return {
      message: `Current market data for ${context.symbol || 'BTC/USD'}:
      - Price: $48,250.75
      - 24h Change: +2.3%
      - Volume: $1.2B
      - Market sentiment: Bullish`,
      type: 'text',
      source: 'market-data',
      metadata: {
        price: 48250.75,
        change: 2.3,
        volume: 1200000000,
        sentiment: 'bullish'
      }
    };
  } else if (queryLower.includes('performance') || queryLower.includes('metrics')) {
    return {
      message: `Strategy performance metrics:
      - Win rate: 62%
      - Profit factor: 1.8
      - Average trade: +$124.50
      - Max drawdown: -8.2%
      - Sharpe ratio: 1.42`,
      type: 'text',
      source: 'strategy',
      metadata: {
        winRate: 62,
        profitFactor: 1.8,
        avgTrade: 124.5,
        maxDrawdown: 8.2,
        sharpeRatio: 1.42
      }
    };
  } else if (queryLower.includes('knowledge') || queryLower.includes('brain')) {
    // Use the knowledge base
    return await queryKnowledgeBase(command.command, context);
  } else {
    // Generic response
    return {
      message: `I've analyzed your query about "${command.command}". To provide more specific information, try asking about market data, strategy performance, or knowledge base content.`,
      type: 'text',
      source: 'eliza',
    };
  }
}

/**
 * Process an action command
 */
async function processElizaAction(
  command: ElizaCommand,
  context: AgentContext
): Promise<ElizaResponse> {
  const actionLower = command.command.toLowerCase();
  
  // Add a signal if we have an execution context
  if (context.executionId && (
    actionLower.includes('buy') || 
    actionLower.includes('sell') || 
    actionLower.includes('long') || 
    actionLower.includes('short')
  )) {
    const direction = 
      actionLower.includes('buy') || actionLower.includes('long') ? 'long' : 'short';
    
    await recordStrategySignal(context.executionId, {
      timestamp: new Date().toISOString(),
      symbol: context.symbol || 'BTC/USD',
      timeframe: context.timeframe || '1h',
      type: 'entry',
      direction,
      price: 48250.75, // Mock price
      message: `ElizaOS generated ${direction} signal based on command: ${command.command}`,
      source: 'eliza',
      score: 0.85,
      metadata: { command }
    });
    
    return {
      message: `I've executed your ${direction} action command. A new trading signal has been generated.`,
      type: 'text',
      source: 'strategy',
      metadata: {
        direction,
        price: 48250.75,
        timestamp: new Date().toISOString()
      }
    };
  } else if (actionLower.includes('analyze') || actionLower.includes('check')) {
    return {
      message: `I've analyzed the current market conditions for ${context.symbol || 'BTC/USD'}:
      - Trend: Upward
      - Support levels: $47,200, $46,500
      - Resistance levels: $48,500, $49,200
      - Volume profile: Above average
      - Volatility: Moderate`,
      type: 'text',
      source: 'analysis',
      metadata: {
        trend: 'upward',
        supports: [47200, 46500],
        resistances: [48500, 49200],
        volume: 'above_average',
        volatility: 'moderate'
      }
    };
  } else {
    return {
      message: `I've processed your action command: "${command.command}". For specific trading actions, please use keywords like "buy", "sell", "analyze", or "check".`,
      type: 'text',
      source: 'eliza',
    };
  }
}

/**
 * Process an analysis command
 */
async function processElizaAnalysis(
  command: ElizaCommand,
  context: AgentContext
): Promise<ElizaResponse> {
  // For a real implementation, this would connect to an AI model
  // For now, we'll return a simulated analysis
  
  // If we have an execution context, add a message
  if (context.executionId) {
    await addExecutionMessage(
      context.executionId,
      `ElizaOS analysis: ${command.command}`
    );
  }
  
  return {
    message: `# Analysis Report for ${context.symbol || 'BTC/USD'}

## Market Conditions
- Current trend is bullish with strong momentum
- Volume increasing in recent sessions
- Key levels: Support at $47,200, Resistance at $48,800

## Technical Indicators
- MACD: Bullish crossover
- RSI: 62 (moderate strength, not overbought)
- Moving Averages: Price above 50 and 200 EMA
- Bollinger Bands: Price near upper band, showing strength

## Recommendation
- Current setup is favorable for long positions
- Suggested entry: $48,300
- Stop loss: $47,100
- Take profit targets: $49,500, $50,200

## Risk Assessment
- Market volatility is moderate
- Correlation with SPX: 0.72 (high)
- Risk:reward ratio for proposed trade: 1:2.4`,
    type: 'text',
    source: 'analysis',
    metadata: {
      trend: 'bullish',
      momentum: 'strong',
      keyLevels: {
        support: 47200,
        resistance: 48800
      },
      technicalIndicators: {
        macd: 'bullish',
        rsi: 62,
        movingAverages: 'bullish',
        bollingerBands: 'upper'
      },
      recommendation: 'long',
      riskAssessment: 'moderate'
    }
  };
}

/**
 * Query the knowledge base for information
 */
async function queryKnowledgeBase(
  query: string, 
  context: AgentContext
): Promise<ElizaResponse> {
  try {
    // Call the semantic search API for brain assets
    const response = await fetch('/api/brain/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 3,
        threshold: 0.6
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to search knowledge base');
    }
    
    const results = await response.json();
    
    // If no results, return generic response
    if (!results || results.length === 0) {
      return {
        message: `I searched the knowledge base for information about "${query}" but couldn't find any relevant information. Try asking about a different topic or refining your query.`,
        type: 'text',
        source: 'knowledge-base',
      };
    }
    
    // Format the results
    const formattedResults = results.map((result: any) => ({
      title: result.asset?.title || 'Unnamed asset',
      assetType: result.asset?.asset_type || 'unknown',
      text: result.chunk_text,
      similarity: result.similarity,
    }));
    
    // Construct a response message
    const message = `Here's what I found in the knowledge base about "${query}":\n\n` + 
      formattedResults.map((r: any, i: number) => 
        `## ${i + 1}. ${r.title} (${r.assetType})\n${r.text}\n\n`
      ).join('');
    
    return {
      message,
      type: 'text',
      source: 'knowledge-base',
      metadata: {
        results: formattedResults
      }
    };
  } catch (error) {
    console.error('Error querying knowledge base:', error);
    return {
      message: `I encountered an error while searching the knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`,
      type: 'error',
      source: 'knowledge-base',
    };
  }
}

/**
 * Get agent instructions
 */
export async function getAgentInstructions(agentId: number): Promise<AgentInstruction[]> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('brain_agent_instructions')
      .select('*')
      .eq('agent_id', agentId)
      .eq('active', true)
      .order('priority', { ascending: true });
    
    if (error) throw error;
    
    return data as AgentInstruction[];
  } catch (error) {
    console.error('Error getting agent instructions:', error);
    return [];
  }
}

/**
 * Create an agent instruction
 */
export async function createAgentInstruction(
  agentId: number,
  title: string,
  content: string,
  type: 'system' | 'user' | 'goal' | 'constraint' | 'procedure',
  priority = 100
): Promise<AgentInstruction> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('brain_agent_instructions')
      .insert({
        agent_id: agentId,
        title,
        content,
        type,
        priority,
        active: true,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data as AgentInstruction;
  } catch (error) {
    console.error('Error creating agent instruction:', error);
    throw error;
  }
}

/**
 * Update an agent instruction
 */
export async function updateAgentInstruction(
  id: number,
  updates: Partial<Omit<AgentInstruction, 'id' | 'agent_id' | 'created_at' | 'updated_at'>>
): Promise<AgentInstruction> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase
      .from('brain_agent_instructions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data as AgentInstruction;
  } catch (error) {
    console.error('Error updating agent instruction:', error);
    throw error;
  }
}

/**
 * Delete an agent instruction
 */
export async function deleteAgentInstruction(id: number): Promise<void> {
  const supabase = createBrowserClient();
  
  try {
    const { error } = await supabase
      .from('brain_agent_instructions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting agent instruction:', error);
    throw error;
  }
}

/**
 * Generate brain context from strategy assets
 * This combines relevant information from brain assets for the agent
 */
export async function generateBrainContext(
  brainAssetIds: number[]
): Promise<string> {
  try {
    const assetContents = await Promise.all(
      brainAssetIds.map(async (id) => {
        try {
          const asset = await getBrainAssetById(id);
          
          // If the asset has content_text, use that
          if (asset.content_text) {
            return {
              title: asset.title,
              type: asset.asset_type,
              content: asset.content_text
            };
          }
          
          // Otherwise download and process the file
          const file = await downloadBrainAsset(asset.storage_path);
          const text = await file.text();
          
          return {
            title: asset.title,
            type: asset.asset_type,
            content: text.slice(0, 1000) // Limit size for context
          };
        } catch (error) {
          console.error(`Error processing brain asset ${id}:`, error);
          return null;
        }
      })
    );
    
    // Filter out nulls and build context
    const validAssets = assetContents.filter(asset => asset !== null);
    
    if (validAssets.length === 0) {
      return "No brain assets available for context.";
    }
    
    // Build a formatted context string
    return validAssets.map(asset => 
      `# ${asset!.title} (${asset!.type})\n\n${asset!.content}\n\n---\n\n`
    ).join('');
    
  } catch (error) {
    console.error('Error generating brain context:', error);
    return "Error generating brain context.";
  }
}
