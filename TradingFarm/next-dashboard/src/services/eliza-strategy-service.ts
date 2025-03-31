/**
 * ElizaOS Strategy Integration Service
 * 
 * This service provides integration between the Strategy Builder interface
 * and ElizaOS AI capabilities for strategy analysis, optimization, and execution.
 */

import websocketService, { WebSocketTopic } from './websocket-service';
import { createBrowserClient } from '@/utils/supabase/client';

// Knowledge query types for strategy analysis
export enum StrategyKnowledgeType {
  PERFORMANCE_ANALYSIS = 'performance-analysis',
  PARAMETER_OPTIMIZATION = 'parameter-optimization',
  CODE_GENERATION = 'code-generation',
  MARKET_INSIGHT = 'market-insight',
  RISK_ANALYSIS = 'risk-analysis',
}

// Strategy metadata interface
export interface StrategyMetadata {
  id?: string;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
}

// Response from ElizaOS
export interface ElizaResponse {
  id: string;
  content: string;
  type: string;
  source: string;
  timestamp: string;
}

/**
 * Initialize connection with ElizaOS
 * @param strategyId Optional strategy ID to associate with the connection
 */
export const initializeElizaConnection = (strategyId?: string) => {
  // Register handlers for ElizaOS responses
  websocketService.subscribe(WebSocketTopic.SYSTEM, (message) => {
    if (message.command === 'ELIZA_CONNECTED') {
      console.log('Connected to ElizaOS');
      
      // If we have a strategy ID, associate it with the ElizaOS connection
      if (strategyId) {
        websocketService.send(WebSocketTopic.SYSTEM, {
          command: 'ASSOCIATE_STRATEGY',
          strategyId
        });
      }
    }
  });
  
  return {
    isConnected: websocketService.isConnected(),
    disconnect: () => websocketService.close()
  };
};

/**
 * Send a command to ElizaOS
 * @param command The command to send
 * @param strategyMetadata Strategy metadata for context
 */
export const sendElizaCommand = (
  command: string,
  strategyMetadata: StrategyMetadata
) => {
  return websocketService.send(WebSocketTopic.SYSTEM, {
    command: 'EXECUTE_COMMAND',
    content: command,
    context: {
      strategyId: strategyMetadata.id,
      strategyName: strategyMetadata.name,
      strategyData: {
        nodes: strategyMetadata.nodes,
        edges: strategyMetadata.edges
      }
    }
  });
};

/**
 * Request a knowledge query from ElizaOS
 * @param queryType Type of knowledge query
 * @param strategyMetadata Strategy metadata for context
 * @param additionalParams Additional parameters for the query
 */
export const queryElizaKnowledge = (
  queryType: StrategyKnowledgeType,
  strategyMetadata: StrategyMetadata,
  additionalParams: Record<string, any> = {}
) => {
  return websocketService.send(WebSocketTopic.SYSTEM, {
    command: 'KNOWLEDGE_QUERY',
    queryType,
    context: {
      strategyId: strategyMetadata.id,
      strategyName: strategyMetadata.name,
      strategyData: {
        nodes: strategyMetadata.nodes,
        edges: strategyMetadata.edges
      }
    },
    params: additionalParams
  });
};

/**
 * Request strategy optimization from ElizaOS
 * @param strategyMetadata Strategy metadata for context
 * @param optimizationGoal Goal of the optimization (e.g., 'maximize_returns', 'minimize_drawdown')
 * @param constraints Constraints for the optimization
 */
export const requestStrategyOptimization = async (
  strategyMetadata: StrategyMetadata,
  optimizationGoal: string,
  constraints: Record<string, any> = {}
) => {
  const result = websocketService.send(WebSocketTopic.SYSTEM, {
    command: 'OPTIMIZE_STRATEGY',
    strategyId: strategyMetadata.id,
    strategyName: strategyMetadata.name,
    strategyData: {
      nodes: strategyMetadata.nodes,
      edges: strategyMetadata.edges
    },
    optimizationGoal,
    constraints
  });
  
  // Log the optimization request
  if (result && strategyMetadata.id) {
    const supabase = createBrowserClient();
    await supabase.from('strategy_optimizations').insert({
      strategy_id: strategyMetadata.id,
      optimization_goal: optimizationGoal,
      constraints: constraints,
      status: 'requested'
    });
  }
  
  return result;
};

/**
 * Generate code implementation for a strategy
 * @param strategyMetadata Strategy metadata for context
 * @param language Target programming language
 */
export const generateStrategyCode = (
  strategyMetadata: StrategyMetadata,
  language: 'python' | 'typescript' | 'json' = 'python'
) => {
  return websocketService.send(WebSocketTopic.SYSTEM, {
    command: 'GENERATE_CODE',
    strategyId: strategyMetadata.id,
    strategyName: strategyMetadata.name,
    strategyData: {
      nodes: strategyMetadata.nodes,
      edges: strategyMetadata.edges
    },
    language
  });
};

/**
 * Save ElizaOS analysis to strategy history
 * @param strategyId Strategy ID
 * @param analysisType Type of analysis
 * @param content Analysis content
 */
export const saveElizaAnalysis = async (
  strategyId: string,
  analysisType: string,
  content: string
) => {
  const supabase = createBrowserClient();
  
  return await supabase.from('strategy_analyses').insert({
    strategy_id: strategyId,
    analysis_type: analysisType,
    content,
    created_at: new Date().toISOString()
  });
};

/**
 * Get saved ElizaOS analyses for a strategy
 * @param strategyId Strategy ID
 */
export const getElizaAnalysesForStrategy = async (strategyId: string) => {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase
    .from('strategy_analyses')
    .select('*')
    .eq('strategy_id', strategyId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching strategy analyses:', error);
    return [];
  }
  
  return data;
};

export default {
  initializeElizaConnection,
  sendElizaCommand,
  queryElizaKnowledge,
  requestStrategyOptimization,
  generateStrategyCode,
  saveElizaAnalysis,
  getElizaAnalysesForStrategy
};
