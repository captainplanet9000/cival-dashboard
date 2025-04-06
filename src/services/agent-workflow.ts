import { FarmAgent } from './farm/farm-service';
import { WorkflowType } from '@/components/agents/AgentWorkflow';
import { llmService } from './llm-service';
import { mcpToolsService, McpToolId } from './mcp-tools-service';

// MCP Tool result format
interface McpToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Workflow execution step
export interface WorkflowStep {
  id: string;
  order: number;
  description: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  result?: string;
  error?: string;
  toolUsed?: string;
  startTime?: Date;
  endTime?: Date;
}

// Workflow execution result
export interface WorkflowExecutionResult {
  success: boolean;
  steps: WorkflowStep[];
  finalResult?: string;
  error?: string;
}

// LLM plan generation result
interface LlmPlanResult {
  success: boolean;
  steps?: Array<{
    description: string;
    tool?: string;
    params?: Record<string, any>;
  }>;
  error?: string;
}

/**
 * AgentWorkflowService - Handles the execution of workflows for different agent types
 * using LLMs for planning and reasoning, and MCP for tool execution
 */
class AgentWorkflowService {
  private static instance: AgentWorkflowService;

  // Private constructor for singleton pattern
  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): AgentWorkflowService {
    if (!AgentWorkflowService.instance) {
      AgentWorkflowService.instance = new AgentWorkflowService();
    }
    return AgentWorkflowService.instance;
  }

  /**
   * Execute a workflow for a specific agent
   * @param agent The agent that will execute the workflow
   * @param workflowType The type of workflow to execute
   * @param input User input/instructions for the workflow
   * @param callbacks Optional callbacks for progress updates
   */
  public async executeWorkflow(
    agent: FarmAgent,
    workflowId: string,
    workflowType: WorkflowType,
    input: string,
    callbacks?: {
      onStepStart?: (step: WorkflowStep) => void;
      onStepComplete?: (step: WorkflowStep) => void;
      onStepError?: (step: WorkflowStep, error: any) => void;
    }
  ): Promise<WorkflowExecutionResult> {
    try {
      // 1. Generate a plan using LLM
      const plan = await llmService.generateWorkflowPlan(agent, workflowType, input);
      
      if (!plan.success || !plan.steps || plan.steps.length === 0) {
        return {
          success: false,
          steps: [],
          error: plan.error || 'Failed to generate workflow plan'
        };
      }

      // 2. Convert LLM plan to executable steps
      const steps: WorkflowStep[] = plan.steps.map((step, index) => ({
        id: crypto.randomUUID(),
        order: index + 1,
        description: step.description,
        status: 'PENDING',
        toolUsed: step.tool
      }));

      // 3. Execute each step in the plan
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const planStep = plan.steps[i];
        
        // Update step status to running
        step.status = 'RUNNING';
        step.startTime = new Date();
        
        // Notify progress if callback provided
        if (callbacks?.onStepStart) {
          callbacks.onStepStart(step);
        }

        try {
          // Execute the step using the appropriate tool if specified
          if (planStep.tool) {
            step.toolUsed = planStep.tool;
            const result = await mcpToolsService.executeTool(
              agent,
              planStep.tool as McpToolId,
              planStep.params || {}
            );
            
            if (result.success) {
              step.result = typeof result.data === 'string' 
                ? result.data 
                : JSON.stringify(result.data);
              step.status = 'COMPLETED';
            } else {
              step.error = result.error;
              step.status = 'FAILED';
            }
          } else {
            // For steps without a specific tool, use LLM to generate a response
            const llmResult = await llmService.generateStepAnalysis(
              agent, 
              workflowType,
              input, 
              step.description, 
              steps.slice(0, i).map(s => ({ description: s.description, result: s.result }))
            );
            
            if (llmResult.success) {
              step.result = llmResult.analysis;
              step.status = 'COMPLETED';
            } else {
              step.error = llmResult.error;
              step.status = 'FAILED';
            }
          }
          
          step.endTime = new Date();
          
          // Notify progress if callback provided
          if (callbacks?.onStepComplete) {
            callbacks.onStepComplete(step);
          }
          
          // If a step fails, stop execution
          if (step.status === 'FAILED') {
            return {
              success: false,
              steps,
              error: `Workflow failed at step ${i + 1}: ${step.error}`
            };
          }
        } catch (error: any) {
          step.status = 'FAILED';
          step.error = error.message || 'Unknown error during step execution';
          step.endTime = new Date();
          
          // Notify progress if callback provided
          if (callbacks?.onStepError) {
            callbacks.onStepError(step, error);
          }
          
          return {
            success: false,
            steps,
            error: `Workflow failed at step ${i + 1}: ${step.error}`
          };
        }
      }

      // 4. Generate final result using LLM based on all completed steps
      const summaryResult = await llmService.generateWorkflowSummary(
        agent,
        workflowType,
        input,
        steps.map(s => ({ description: s.description, result: s.result }))
      );

      return {
        success: true,
        steps,
        finalResult: summaryResult.success ? summaryResult.summary : 'Workflow completed successfully.'
      };
    } catch (error: any) {
      console.error('Error executing workflow:', error);
      return {
        success: false,
        steps: [],
        error: error.message || 'Unknown error during workflow execution'
      };
    }
  }

  /**
   * Generate a workflow plan using an LLM
   * @param agent The agent that will execute the workflow
   * @param workflowType The type of workflow to plan
   * @param input User input/instructions for the workflow
   */
  private async generateWorkflowPlan(
    agent: FarmAgent,
    workflowType: WorkflowType,
    input: string
  ): Promise<LlmPlanResult> {
    try {
      // TODO: Implement actual LLM integration
      // For now, return mock plans based on workflow type
      
      const mockPlans: Record<WorkflowType, Array<{description: string; tool?: string; params?: Record<string, any>}>> = {
        'MARKET_ANALYSIS': [
          { description: 'Fetch current market data for specified assets', tool: 'exchange_data', params: { assets: this.extractAssets(input) } },
          { description: 'Analyze price trends and patterns', tool: 'price_analysis', params: { timeframe: '4h' } },
          { description: 'Generate sentiment analysis from news and social media', tool: 'market_sentiment' },
          { description: 'Compile final market report with recommendations' }
        ],
        'RISK_ASSESSMENT': [
          { description: 'Evaluate current portfolio exposure and asset allocation' },
          { description: 'Calculate volatility metrics for each asset', tool: 'price_analysis', params: { metric: 'volatility' } },
          { description: 'Assess market correlation factors between assets' },
          { description: 'Generate risk report with recommendations' }
        ],
        'TRADE_EXECUTION': [
          { description: 'Validate trade parameters and check viability' },
          { description: 'Check available balance for trade execution', tool: 'exchange_data', params: { data: 'balance' } },
          { description: 'Find optimal execution route for best price' },
          { description: 'Submit order to exchange', tool: 'trade_execution' },
          { description: 'Confirm order execution and update records' }
        ],
        'PORTFOLIO_REBALANCE': [
          { description: 'Analyze current portfolio allocation and imbalances' },
          { description: 'Determine target allocation based on risk profile and market conditions' },
          { description: 'Calculate required trades to reach target allocation' },
          { description: 'Execute rebalancing trades', tool: 'trade_execution' },
          { description: 'Verify final portfolio composition after rebalancing' }
        ]
      };
      
      return {
        success: true,
        steps: mockPlans[workflowType] || []
      };
    } catch (error: any) {
      console.error('Error generating workflow plan:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate workflow plan'
      };
    }
  }

  /**
   * Extract assets from user input text
   */
  private extractAssets(input: string): string[] {
    // Simple regex to find cryptocurrency symbols
    // Look for common patterns like BTC, ETH, etc.
    const matches = input.match(/\b(BTC|ETH|SOL|USDT|USDC|BNB|ADA|DOT|XRP|AVAX|MATIC|DOGE|SHIB|LINK|UNI)\b/gi) || [];
    return [...new Set(matches.map(m => m.toUpperCase()))]; // Remove duplicates
  }

  /**
   * Execute a specific tool for a workflow step
   * @param agent The agent executing the tool
   * @param toolId The ID of the tool to execute
   * @param params Parameters for the tool
   */
  private async executeTool(
    agent: FarmAgent,
    toolId: string,
    params: Record<string, any>
  ): Promise<McpToolResult> {
    try {
      // TODO: Implement actual MCP tool execution
      // For now, return mock results based on tool ID
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockResults: Record<string, any> = {
        'exchange_data': {
          success: true,
          data: {
            BTC: { price: 51750.42, change_24h: 2.3, volume: 24567890123 },
            ETH: { price: 3024.18, change_24h: 1.7, volume: 12345678901 },
            SOL: { price: 148.53, change_24h: 4.2, volume: 5678901234 }
          }
        },
        'price_analysis': {
          success: true,
          data: "Analysis complete. BTC showing a bullish divergence pattern on the 4-hour chart. Support at $50,800 and resistance at $52,400."
        },
        'market_sentiment': {
          success: true,
          data: "Sentiment analysis: BTC - 72% positive, ETH - 65% positive, SOL - 81% positive. General market sentiment is bullish with cautious optimism."
        },
        'trade_execution': {
          success: true,
          data: "Order executed successfully. Bought 0.15 BTC at $51,750. Transaction ID: 0x8f72a3b5c94e62f7b923a1d75."
        },
        'defi_swap': {
          success: true,
          data: "Swap executed via SushiSwap. Exchanged 1000 USDC for 0.019 BTC. Effective rate: $52,631 per BTC. Gas fee: 0.002 ETH."
        }
      };
      
      return mockResults[toolId] || { 
        success: false, 
        error: `Tool ${toolId} not implemented or not available for this agent.` 
      };
    } catch (error: any) {
      console.error(`Error executing tool ${toolId}:`, error);
      return {
        success: false,
        error: error.message || `Failed to execute tool ${toolId}`
      };
    }
  }

  /**
   * Generate a response for a workflow step using an LLM
   * @param agent The agent executing the workflow
   * @param workflowType The type of workflow
   * @param input User input/instructions
   * @param stepDescription The description of the current step
   * @param previousSteps Previous steps with their results
   */
  private async generateStepResponse(
    agent: FarmAgent,
    workflowType: WorkflowType,
    input: string,
    stepDescription: string,
    previousSteps: Array<{description: string; result?: string}>
  ): Promise<string> {
    try {
      // TODO: Implement actual LLM integration
      // For now, return mock responses based on step description
      
      // Mock responses based on common step descriptions
      const mockResponses: Record<string, string> = {
        'Analyze current portfolio allocation': 
          'Current portfolio allocation: BTC (45%), ETH (30%), SOL (15%), USDC (10%). Compared to target allocation (BTC 40%, ETH 30%, SOL 20%, USDC 10%), BTC is overweight by 5% and SOL is underweight by 5%.',
        
        'Determine target allocation': 
          'Based on market conditions and risk profile, recommended target allocation: BTC (40%), ETH (25%), SOL (25%), USDC (10%). Increasing SOL allocation due to strong technical indicators and reducing ETH slightly due to upcoming technical event risk.',
        
        'Calculate required trades': 
          'To rebalance portfolio: Sell 0.02 BTC (approx. $1,035), Buy 0.69 SOL (approx. $102). Estimated gas fees: 0.003 ETH. Net rebalance cost: ~$9.',
        
        'Verify final portfolio composition': 
          'Portfolio successfully rebalanced. New allocation: BTC (40.1%), ETH (29.9%), SOL (20.1%), USDC (9.9%). Within 0.1% of target allocation. Portfolio beta: 0.85, Sharpe ratio: 1.4.',
        
        'Compile final market report': 
          'Market Report Summary: BTC shows strong accumulation patterns with decreasing selling pressure. Major resistance at $52,400 needs to be broken for continued uptrend. ETH remains correlated to BTC with upcoming protocol upgrade potentially acting as catalyst. SOL showing strongest momentum among major altcoins with institutional inflows increasing. Recommendation: Maintain current allocations with slight increase to SOL position on any market-wide dips.'
      };
      
      // Return matching response or generate a generic one
      return mockResponses[stepDescription] || 
        `Completed ${stepDescription} successfully. Analysis shows positive indicators for the assets mentioned in your query.`;
    } catch (error: any) {
      console.error('Error generating step response:', error);
      return `Error while ${stepDescription.toLowerCase()}: ${error.message}`;
    }
  }

  /**
   * Generate a summary of the entire workflow execution
   * @param agent The agent that executed the workflow
   * @param workflowType The type of workflow
   * @param input User input/instructions
   * @param steps All workflow steps with their results
   */
  private async generateWorkflowSummary(
    agent: FarmAgent,
    workflowType: WorkflowType,
    input: string,
    steps: Array<{description: string; result?: string}>
  ): Promise<string> {
    try {
      // TODO: Implement actual LLM integration
      // For now, return mock summaries based on workflow type
      
      const summaries: Record<string, string> = {
        'MARKET_ANALYSIS': 
          'Market Analysis Summary: Based on the analysis of current market data, price trends, and sentiment, BTC is showing bullish momentum with strong support established at $50,800. ETH correlation remains high but technicals are slightly weaker. SOL demonstrates the strongest positive sentiment and price action. Recommended actions: Maintain BTC exposure, consider increasing SOL allocation on dips, and monitor ETH closely around the upcoming network upgrade.',
        
        'RISK_ASSESSMENT': 
          'Risk Assessment Summary: Portfolio currently has moderate risk exposure with a Sharpe ratio of 1.4 and beta of 0.85 to BTC. Volatility is within acceptable parameters for the specified risk tolerance. Correlation between BTC and ETH remains high (0.82), while SOL shows more independent price action (0.64 correlation). Primary risk factors: regulatory developments, smart contract vulnerabilities, and leverage across the broader market. Recommended hedging strategies: maintain 10% stablecoin reserve and consider setting stop-loss orders at key support levels.',
        
        'TRADE_EXECUTION':
          'Trade Execution Summary: Successfully executed the requested trade. Purchased 0.15 BTC at an average price of $51,750 with 0.1% slippage (below the 0.3% maximum specified). Order spread across two exchanges for optimal execution. Transaction details stored and portfolio updated. Current position: 0.85 BTC (11.3% of portfolio).',
        
        'PORTFOLIO_REBALANCE':
          'Portfolio Rebalance Summary: Successfully rebalanced portfolio to target allocations with minimal slippage. Sold 0.02 BTC and purchased 0.69 SOL to achieve optimal asset distribution based on current market conditions and risk parameters. New allocation closely matches target: BTC (40.1%), ETH (29.9%), SOL (20.1%), USDC (9.9%). Estimated annual volatility reduced by 2.3% while maintaining similar expected returns, improving the portfolio\'s risk-adjusted performance.'
      };
      
      return summaries[workflowType] || 
        'Workflow completed successfully. All steps executed as planned with the expected results.';
    } catch (error: any) {
      console.error('Error generating workflow summary:', error);
      return `Workflow completed but encountered an error during summary generation: ${error.message}`;
    }
  }
}

// Export singleton instance
export const agentWorkflowService = AgentWorkflowService.getInstance(); 