// Follow this setup guide to integrate the Deno runtime:
// https://deno.land/manual/examples/supabase_oauth
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { exponentialBackoffRetry } from "https://deno.land/x/retry@v2.0.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Agent runner types
type AgentStatus = "idle" | "active" | "paused" | "error" | "error_internal" | "paused_external_issue" | "stopped";
type ErrorType = "TRANSIENT" | "EXTERNAL_PERSISTENT" | "INTERNAL";
type AgentType = "elizaos";
type RiskLevel = "low" | "medium" | "high";

interface AgentConfig {
  agentType: AgentType;
  markets: string[];
  risk_level: RiskLevel;
  api_access: boolean;
  trading_permissions: string;
  auto_recovery: boolean;
  max_concurrent_tasks?: number;
  llm_model?: string;
}

interface ElizaAgent {
  id: string;
  name: string;
  farm_id: number;
  status: AgentStatus;
  config: AgentConfig;
  performance_metrics: {
    commands_processed: number;
    success_rate: number;
    average_response_time_ms: number;
    uptime_percentage: number;
    last_active_at?: string;
    errors_count?: number;
    warnings_count?: number;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Main HTTP handler for the agent-runner function
 * This can be triggered by:
 * 1. A scheduled cron job (via Supabase)
 * 2. Manual invocation via API
 * 3. Webhook from an external system
 */
serve(async (req) => {
  // Handle preflight CORS request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request data
    const { agentId, manual } = await req.json();
    
    // If specific agent ID is provided, run only that agent
    if (agentId) {
      const result = await runSpecificAgent(supabase, agentId);
      return new Response(
        JSON.stringify(result),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          },
          status: result.success ? 200 : 400
        }
      );
    }
    
    // Otherwise run scheduled execution of all active agents
    const results = await runScheduledAgents(supabase);
    return new Response(
      JSON.stringify({ success: true, results }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("Error in agent-runner:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        },
        status: 500
      }
    );
  }
});

/**
 * Run a specific agent by ID
 */
async function runSpecificAgent(supabase, agentId: string) {
  try {
    // Fetch the agent
    const { data: agent, error } = await supabase
      .from("elizaos_agents")
      .select("*")
      .eq("id", agentId)
      .single();
    
    if (error || !agent) {
      throw new Error(`Agent not found: ${error?.message || 'Unknown error'}`);
    }
    
    // Run the agent
    const result = await processAgent(supabase, agent);
    return { 
      success: true, 
      agent: agent.id,
      result 
    };
  } catch (error) {
    console.error(`Failed to run agent ${agentId}:`, error);
    await logAgentError(supabase, agentId, error);
    return { 
      success: false, 
      agent: agentId,
      error: error.message 
    };
  }
}

/**
 * Run all scheduled agents that are in "active" status with concurrency control
 */
async function runScheduledAgents(supabase) {
  try {
    // Use the stored procedure with advisory locks to get agents to process
    const { data: agents, error } = await supabase.rpc(
      'get_active_agents_with_lock',
      {
        batch_size: 10, // Process in batches of 10 at a time
        max_processing_time_ms: 8000 // Edge function time constraint
      }
    );
    
    if (error) {
      throw new Error(`Failed to fetch agents: ${error.message}`);
    }
    
    if (!agents || agents.length === 0) {
      console.log('No active agents ready for processing');
      return { processed: 0 };
    }
    
    console.log(`Processing ${agents.length} agents with concurrency control`);
    
    // Process agents with controlled concurrency using Promise.allSettled
    const processingResults = await Promise.allSettled(
      agents.map(agent => processAgentWithTimeout(supabase, agent, 2000))
    );
    
    // Handle the results and release any locks as needed
    const results = await Promise.all(
      processingResults.map((result, idx) => 
        handleAgentProcessingResult(supabase, agents[idx], result)
      )
    );
    
    return {
      processed: agents.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  } catch (error) {
    console.error('Error in runScheduledAgents:', error);
    return {
      processed: 0,
      error: error.message
    };
  }
  // Process each agent
  const results = [];
  for (const agent of agents) {
    try {
      const result = await processAgent(supabase, agent);
      results.push({ 
        agent: agent.id, 
        success: true, 
        result 
      });
    } catch (error) {
      console.error(`Error processing agent ${agent.id}:`, error);
      await logAgentError(supabase, agent.id, error);
      results.push({ 
        agent: agent.id, 
        success: false, 
        error: error.message 
      });
    }
  }
}

/**
 * Handle the result of agent processing and release locks if needed
 */
async function handleAgentProcessingResult(supabase, agent: ElizaAgent, result: PromiseSettledResult<any>) {
  if (result.status === 'fulfilled') {
    return {
      agent_id: agent.id,
      success: true,
      result: result.value
    };
  } else {
    const error = result.reason;
    
    // Log the error
    await logAgentError(supabase, agent.id, error);
    
    // If this was a timeout, mark it specially
    if (error.isTimeout) {
      await updateAgentStatus(supabase, agent.id, 'paused', {
        warnings_count: (agent.performance_metrics?.warnings_count || 0) + 1,
        last_error: 'Processing timeout exceeded'
      });
    }
    
    return {
      agent_id: agent.id,
      success: false,
      error: error.message
    };
  }
}

/**
 * Process a single agent's actions
 */
async function processAgent(supabase, agent: ElizaAgent) {
  const startTime = Date.now();
  
  try {
    // Log that the agent is being processed
    await logAgentActivity(
      supabase,
      agent.id,
      "info",
      `Processing agent: ${agent.name}`
    );
    
    // Fetch market data for the agent's configured markets
    const marketData = await fetchMarketData(agent.config.markets);
    
    // Execute the agent's strategy based on configuration and market data
    const strategy = await executeAgentStrategy(agent, marketData);
    
    // Execute any trades from the strategy
    const trades = await executeTrades(agent, strategy.trades || []);
    
    // Calculate metrics
    const executionTime = Date.now() - startTime;
    const successRate = calculateSuccessRate(agent, true);
    const avgResponseTime = calculateAvgResponseTime(agent, executionTime);
    
    // Update agent metrics
    await updateAgentMetrics(supabase, agent.id, {
      commands_processed: (agent.performance_metrics?.commands_processed || 0) + 1,
      success_rate: successRate,
      average_response_time_ms: avgResponseTime,
      last_active_at: new Date().toISOString(),
      uptime_percentage: agent.performance_metrics?.uptime_percentage || 100 // Would need more logic for true uptime
    });
    
    // Log success
    await logAgentActivity(
      supabase,
      agent.id,
      "info",
      `Agent execution completed successfully in ${executionTime}ms`,
      { marketData, strategy, trades }
    );
    
    return {
      success: true,
      executionTime,
      trades: trades
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Handle the error with sophisticated error classification and recovery
    await handleAgentError(supabase, agent, error, executionTime);
    
    throw error;
  }
}

/**
 * Fetch market data for the specified markets with source prioritization and fallback
 */
async function fetchMarketData(markets: string[]) {
  // Define available data sources in priority order
  const dataSources = [
    { name: 'primary', fetcher: fetchFromPrimarySource },
    { name: 'secondary', fetcher: fetchFromSecondarySource },
    { name: 'fallback', fetcher: fetchFromFallbackSource }
  ];
  
  const marketData = {};
  const errors = [];
  
  for (const market of markets) {
    let dataFetched = false;
    
    // Try each data source in priority order
    for (const source of dataSources) {
      if (dataFetched) break;
      
      try {
        // Use exponential backoff for transient errors
        const data = await exponentialBackoffRetry(
          () => source.fetcher(market),
          {
            maxAttempts: 3,
            initialDelay: 100,
            maxDelay: 1000,
            factor: 2,
            jitter: true,
            retryableErrors: [Error] // Can be refined to specific error types
          }
        );
        
        marketData[market] = {
          ...data,
          source: source.name,
          timestamp: new Date().toISOString()
        };
        
        dataFetched = true;
      } catch (error) {
        console.error(`Error fetching ${market} from ${source.name}:`, error);
        errors.push({
          market,
          source: source.name,
          error: error.message
        });
      }
    }
    
    // If all sources failed, use a generated fallback
    if (!dataFetched) {
      console.warn(`All data sources failed for ${market}, using generated fallback`);
      marketData[market] = generateFallbackMarketData(market);
    }
  }
  
  // If there were any errors, attach them to the result for logging
  if (errors.length > 0) {
    marketData._errors = errors;
  }
  
  return marketData;
}

// Primary market data source implementation
async function fetchFromPrimarySource(market: string) {
  // This would be a real API call in production
  // For now, we'll simulate a successful response with occasional failures
  if (Math.random() < 0.1) { // 10% chance of failure
    throw new Error('Primary source temporarily unavailable');
  }
  
  return {
    symbol: market,
    price: Math.random() * 50000 + 10000,
    bidPrice: Math.random() * 50000 + 9900,
    askPrice: Math.random() * 50000 + 10100,
    volume24h: Math.random() * 1000000,
    change24h: (Math.random() * 10 - 5) / 100,
    high24h: Math.random() * 55000 + 10000,
    low24h: Math.random() * 45000 + 9000
  };
}

// Secondary market data source implementation
async function fetchFromSecondarySource(market: string) {
  // Simulate a higher failure rate for the secondary source
  if (Math.random() < 0.2) { // 20% chance of failure
    throw new Error('Secondary source connection failed');
  }
  
  return {
    symbol: market,
    price: Math.random() * 49000 + 10500, // Slightly different prices
    bidPrice: Math.random() * 49000 + 10400,
    askPrice: Math.random() * 49000 + 10600,
    volume24h: Math.random() * 950000,
    change24h: (Math.random() * 9.5 - 4.5) / 100
  };
}

// Fallback source (very reliable but less detailed)
async function fetchFromFallbackSource(market: string) {
  // Almost never fails
  if (Math.random() < 0.02) { // 2% chance of failure
    throw new Error('Fallback source unavailable');
  }
  
  return {
    symbol: market,
    price: Math.random() * 48000 + 11000,
    volume24h: Math.random() * 900000,
    timestamp: new Date().toISOString()
  };
}

// Generate fallback data when all sources fail
function generateFallbackMarketData(market: string) {
  return {
    symbol: market,
    price: Math.random() * 50000 + 10000,
    bidPrice: Math.random() * 50000 + 9900,
    askPrice: Math.random() * 50000 + 10100,
    volume24h: Math.random() * 1000000,
    change24h: 0,
    source: 'generated_fallback',
    isEstimated: true,
    timestamp: new Date().toISOString(),
    reliability: 'low'
  };
}

/**
 * Execute the agent's strategy based on configuration and market data
 */
async function executeAgentStrategy(agent: ElizaAgent, marketData: any) {
  // This would contain the core logic for executing the agent's strategy
  // In a production environment, this would integrate with your strategy service
  
  const { config } = agent;
  const strategy = config.strategyType || 'trend_following';
  
  // Simple mock implementation
  const decisions = {
    trades: [],
    summary: {
      strategy,
      marketsAnalyzed: Object.keys(marketData).length,
      signalsGenerated: 0,
      tradingDecisions: 0
    }
  };
  
  // Process each market
  for (const market of Object.keys(marketData)) {
    const data = marketData[market];
    
    // Basic trend following logic (simplified for demonstration)
    if (strategy === 'trend_following') {
      if (data.change24h > 0.5) {
        // Bullish signal
        decisions.trades.push({
          market,
          action: 'buy',
          reason: `Uptrend detected (${data.change24h.toFixed(2)}%)`,
          confidence: 0.7 + Math.random() * 0.3
        });
        decisions.summary.signalsGenerated++;
        decisions.summary.tradingDecisions++;
      } else if (data.change24h < -0.5) {
        // Bearish signal
        decisions.trades.push({
          market,
          action: 'sell',
          reason: `Downtrend detected (${data.change24h.toFixed(2)}%)`,
          confidence: 0.7 + Math.random() * 0.3
        });
        decisions.summary.signalsGenerated++;
        decisions.summary.tradingDecisions++;
      }
    }
    // Add other strategy implementations as needed
  }
  
  return decisions;
}

/**
 * Execute trades based on agent decisions
 */
async function executeTrades(agent: ElizaAgent, trades: any[]) {
  // In a production environment, this would integrate with your exchange service
  // Here's a simplified mock implementation
  
  const results = {
    totalTrades: trades.length,
    successfulTrades: 0,
    failedTrades: 0,
    details: [],
    summary: {}
  };
  
  for (const trade of trades) {
    // Simulate trade execution with 90% success rate
    const isSuccessful = Math.random() > 0.1;
    
    results.details.push({
      market: trade.market,
      action: trade.action,
      success: isSuccessful,
      executionTime: new Date().toISOString(),
      ...(isSuccessful ? {
        orderId: `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        price: trade.action === 'buy' ? marketData[trade.market].askPrice : marketData[trade.market].bidPrice,
        status: 'filled'
      } : {
        error: 'Simulated execution failure'
      })
    });
    
    if (isSuccessful) {
      results.successfulTrades++;
    } else {
      results.failedTrades++;
    }
  }
  
  results.summary = {
    totalTrades: results.totalTrades,
    successfulTrades: results.successfulTrades,
    failedTrades: results.failedTrades,
    successRate: results.totalTrades > 0 ? results.successfulTrades / results.totalTrades : 0
  };
  
  return results;
}

/**
 * Update agent status
 */
async function updateAgentStatus(supabase, agentId: string, status: AgentStatus, additionalMetrics = {}) {
  const { error } = await supabase
    .from("elizaos_agents")
    .update({ 
      status, 
      updated_at: new Date().toISOString(),
      ...(Object.keys(additionalMetrics).length > 0 ? {
        performance_metrics: supabase.rpc("update_json_field", {
          table_name: "elizaos_agents",
          record_id: agentId,
          field_name: "performance_metrics",
          nested_field_updates: additionalMetrics
        })
      } : {})
    })
    .eq("id", agentId);
  
  if (error) {
    console.error(`Failed to update agent status:`, error);
    throw error;
  }
}

/**
 * Update agent metrics
 */
async function updateAgentMetrics(supabase, agentId: string, metrics: any) {
  const { error } = await supabase.rpc("update_agent_metrics", {
    p_agent_id: agentId,
    p_metrics: metrics
  });
  
  if (error) {
    console.error(`Failed to update agent metrics:`, error);
    // Don't throw here to prevent cascading failures
  }
}

/**
 * Log agent activity
 */
async function logAgentActivity(
  supabase, 
  agentId: string, 
  level: "info" | "warning" | "error" | "debug", 
  message: string, 
  details = null
) {
  const { error } = await supabase
    .from("agent_logs")
    .insert({
      agent_id: agentId,
      level,
      message,
      details,
      timestamp: new Date().toISOString(),
      source: "edge-function"
    });
  
  if (error) {
    console.error(`Failed to log agent activity:`, error);
    // Don't throw here to prevent cascading failures
  }
}

/**
 * Log agent error (convenience wrapper)
 */
async function logAgentError(supabase, agentId: string, error: any) {
  return logAgentActivity(
    supabase,
    agentId,
    "error",
    error.message || "Unknown error occurred",
    { stack: error.stack }
  );
}

/**
 * Calculate the updated success rate
 */
function calculateSuccessRate(agent: ElizaAgent, isSuccess: boolean) {
  const currentRate = agent.performance_metrics.success_rate || 1.0;
  const totalProcessed = agent.performance_metrics.commands_processed || 0;
  
  if (totalProcessed === 0) {
    return isSuccess ? 1.0 : 0.0;
  }
  
  // Weighted average that gives more weight to recent executions
  const weight = Math.min(0.1, 1 / (totalProcessed + 1));
  return currentRate * (1 - weight) + (isSuccess ? 1.0 : 0.0) * weight;
}

/**
 * Calculate the updated average response time
 */
function calculateAvgResponseTime(agent: ElizaAgent, currentTime: number) {
  const currentAvg = agent.performance_metrics.average_response_time_ms || 0;
  const totalProcessed = agent.performance_metrics.commands_processed || 0;
  
  if (totalProcessed === 0) {
    return currentTime;
  }
  
  // Simple running average
  return (currentAvg * totalProcessed + currentTime) / (totalProcessed + 1);
}

/**
 * Handle agent errors with sophisticated error classification and recovery
 */
async function handleAgentError(supabase, agent: ElizaAgent, error: any, executionTime: number) {
  // Classify the error type
  const errorType = classifyError(error);
  
  // Calculate metrics for failed execution
  const successRate = calculateSuccessRate(agent, false);
  const avgResponseTime = calculateAvgResponseTime(agent, executionTime);
  
  // Update basic metrics regardless of error type
  const baseMetricsUpdate = {
    commands_processed: (agent.performance_metrics?.commands_processed || 0) + 1,
    success_rate: successRate,
    average_response_time_ms: avgResponseTime,
    last_active_at: new Date().toISOString(),
    errors_count: (agent.performance_metrics?.errors_count || 0) + 1
  };
  
  switch (errorType) {
    case "TRANSIENT":
      // For transient errors, apply backoff retry logic
      await updateAgentMetrics(supabase, agent.id, {
        ...baseMetricsUpdate,
        last_error: `Transient error: ${error.message}`,
        retry_count: (agent.performance_metrics?.retry_count || 0) + 1
      });
      
      await logAgentActivity(
        supabase,
        agent.id,
        "warning",
        `Agent encountered a transient error: ${error.message}`,
        { 
          stack: error.stack,
          recovery: "exponential_backoff",
          retry_count: (agent.performance_metrics?.retry_count || 0) + 1
        }
      );
      break;
      
    case "EXTERNAL_PERSISTENT":
      // For external persistent errors, pause the agent with specific reason
      await updateAgentStatus(supabase, agent.id, "paused_external_issue", {
        ...baseMetricsUpdate,
        last_error: `External service error: ${error.message}`,
        external_error_count: (agent.performance_metrics?.external_error_count || 0) + 1
      });
      
      await logAgentActivity(
        supabase,
        agent.id,
        "error",
        `Agent paused due to persistent external error: ${error.message}`,
        { 
          stack: error.stack,
          recovery: "manual_intervention",
          error_type: "external_persistent" 
        }
      );
      
      // Trigger an alert for this external issue
      await triggerAgentAlert(supabase, agent.id, "external_service_error", {
        error: error.message,
        agent_name: agent.name,
        timestamp: new Date().toISOString()
      });
      break;
      
    case "INTERNAL":
    default:
      // For internal errors, set error state and capture detailed context
      await updateAgentStatus(supabase, agent.id, "error_internal", {
        ...baseMetricsUpdate,
        last_error: `Internal error: ${error.message}`,
        internal_error_count: (agent.performance_metrics?.internal_error_count || 0) + 1
      });
      
      // Capture the agent state for debugging
      const agentState = await captureAgentState(supabase, agent.id);
      
      await logAgentActivity(
        supabase,
        agent.id,
        "error",
        `Agent encountered an internal error: ${error.message}`,
        { 
          stack: error.stack,
          recovery: "requires_investigation",
          error_type: "internal",
          agent_state: agentState
        }
      );
      
      // Trigger a high-priority alert for internal errors
      await triggerAgentAlert(supabase, agent.id, "agent_internal_error", {
        error: error.message,
        agent_name: agent.name,
        agent_id: agent.id,
        timestamp: new Date().toISOString(),
        priority: "high"
      });
      break;
  }
}

/**
 * Classify an error by type for appropriate handling
 */
function classifyError(error: any): ErrorType {
  const errorMessage = (error.message || '').toLowerCase();
  const errorName = (error.name || '').toLowerCase();
  
  // Transient errors - typically can be retried
  if (
    errorMessage.includes('network') || 
    errorMessage.includes('timeout') || 
    errorMessage.includes('rate limit') ||
    errorMessage.includes('temporary') ||
    errorName === 'networkerror' ||
    errorName === 'timeouterror'
  ) {
    return "TRANSIENT";
  }
  
  // External service errors - issues with external APIs
  if (
    errorName === 'exchangeapierror' ||
    errorName === 'marketdataerror' ||
    errorMessage.includes('api key') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('service unavailable') ||
    errorMessage.includes('maintenance') ||
    errorMessage.includes('exchange')
  ) {
    return "EXTERNAL_PERSISTENT";
  }
  
  // Default to internal error if we can't identify it
  return "INTERNAL";
}

/**
 * Capture the current state of an agent for debugging purposes
 */
async function captureAgentState(supabase, agentId: string) {
  try {
    // Get the agent's current data
    const { data: agent } = await supabase
      .from("elizaos_agents")
      .select("*")
      .eq("id", agentId)
      .single();
    
    // Get the most recent logs
    const { data: recentLogs } = await supabase
      .from("agent_logs")
      .select("*")
      .eq("agent_id", agentId)
      .order("timestamp", { ascending: false })
      .limit(10);
    
    // Get any recent trades
    const { data: recentTrades } = await supabase
      .from("trades")
      .select("*")
      .eq("agent_id", agentId)
      .order("timestamp", { ascending: false })
      .limit(5);
    
    return {
      agent_data: agent,
      recent_logs: recentLogs,
      recent_trades: recentTrades,
      environment: {
        timestamp: new Date().toISOString(),
        function_id: crypto.randomUUID()
      }
    };
  } catch (error) {
    console.error(`Error capturing agent state: ${error.message}`);
    return { capture_error: error.message };
  }
}

/**
 * Trigger an alert for agent issues
 */
async function triggerAgentAlert(supabase, agentId: string, alertType: string, details: any) {
  try {
    await supabase
      .from("monitoring_events")
      .insert({
        type: `alert.${alertType}`,
        level: details.priority === "high" ? "critical" : "error",
        agent_id: agentId,
        message: details.error || "Agent alert triggered",
        details: details
      });
    
    console.log(`Alert triggered: ${alertType} for agent ${agentId}`);
  } catch (error) {
    console.error(`Failed to trigger alert: ${error.message}`);
    // Don't throw here to prevent cascading failures
  }
}
