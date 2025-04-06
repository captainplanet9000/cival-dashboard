import { FarmAgent } from './farm/farm-service';
import { WorkflowType } from '@/components/agents/AgentWorkflow';

// Response from LLM plan generation
export interface LlmPlanResponse {
  success: boolean;
  steps?: Array<{
    description: string;
    tool?: string;
    params?: Record<string, any>;
  }>;
  error?: string;
}

// Response from LLM analysis
export interface LlmAnalysisResponse {
  success: boolean;
  analysis?: string;
  error?: string;
}

// Response from LLM summary generation
export interface LlmSummaryResponse {
  success: boolean;
  summary?: string;
  error?: string;
}

/**
 * LlmService for handling natural language processing tasks
 * This service integrates with LLMs via MCP to provide planning, analysis, and summarization
 * capabilities for agent workflows
 */
class LlmService {
  private static instance: LlmService;
  private apiEndpoint: string;
  private apiKey?: string;

  private constructor() {
    // Initialize with default values or environment variables
    this.apiEndpoint = process.env.LLM_API_ENDPOINT || 'https://api.llm-provider.com';
    this.apiKey = process.env.LLM_API_KEY;
  }

  public static getInstance(): LlmService {
    if (!LlmService.instance) {
      LlmService.instance = new LlmService();
    }
    return LlmService.instance;
  }

  /**
   * Generate a step-by-step workflow plan based on agent type, workflow type, and user input
   * @param agent The agent that will execute the workflow
   * @param workflowType The type of workflow to plan
   * @param input User input/instructions
   */
  public async generateWorkflowPlan(
    agent: FarmAgent,
    workflowType: WorkflowType,
    input: string
  ): Promise<LlmPlanResponse> {
    try {
      // In a real implementation, this would call an LLM API
      // For now, we'll use our MCP mock data

      // Build prompt for the LLM
      const prompt = this.buildPlanningPrompt(agent, workflowType, input);
      
      // Call LLM via MCP or directly
      const response = await this.callMcpLlm({
        prompt,
        temperature: 0.2,
        maxTokens: 1500,
        task: 'workflow_planning'
      });
      
      // Parse response into steps
      return this.parseWorkflowPlanResponse(response, workflowType);
    } catch (error: any) {
      console.error('Error generating workflow plan:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate workflow plan'
      };
    }
  }

  /**
   * Generate analysis for a specific workflow step
   * @param agent The agent executing the workflow
   * @param workflowType The type of workflow
   * @param input User input/instructions
   * @param stepDescription The current step description
   * @param previousSteps Previous steps with their results
   */
  public async generateStepAnalysis(
    agent: FarmAgent,
    workflowType: WorkflowType,
    input: string,
    stepDescription: string,
    previousSteps: Array<{description: string; result?: string}>
  ): Promise<LlmAnalysisResponse> {
    try {
      // Build prompt for step analysis
      const prompt = this.buildStepAnalysisPrompt(
        agent, 
        workflowType, 
        input, 
        stepDescription, 
        previousSteps
      );
      
      // Call LLM via MCP
      const response = await this.callMcpLlm({
        prompt,
        temperature: 0.3,
        maxTokens: 1000,
        task: 'step_analysis'
      });
      
      return {
        success: true,
        analysis: response.text
      };
    } catch (error: any) {
      console.error('Error generating step analysis:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate step analysis'
      };
    }
  }

  /**
   * Generate a workflow summary based on completed steps
   * @param agent The agent that executed the workflow
   * @param workflowType The type of workflow
   * @param input User input/instructions
   * @param steps All workflow steps with their results
   */
  public async generateWorkflowSummary(
    agent: FarmAgent,
    workflowType: WorkflowType,
    input: string,
    steps: Array<{description: string; result?: string}>
  ): Promise<LlmSummaryResponse> {
    try {
      // Build prompt for workflow summary
      const prompt = this.buildSummaryPrompt(agent, workflowType, input, steps);
      
      // Call LLM via MCP
      const response = await this.callMcpLlm({
        prompt,
        temperature: 0.4,
        maxTokens: 800,
        task: 'workflow_summary'
      });
      
      return {
        success: true,
        summary: response.text
      };
    } catch (error: any) {
      console.error('Error generating workflow summary:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate workflow summary'
      };
    }
  }

  /**
   * Use LLM to extract parameters from user input
   * @param input User input
   * @param parameterSchema Schema defining the expected parameters
   */
  public async extractParameters(
    input: string,
    parameterSchema: Record<string, {type: string; description: string}>
  ): Promise<Record<string, any>> {
    try {
      // Build prompt for parameter extraction
      const prompt = this.buildParameterExtractionPrompt(input, parameterSchema);
      
      // Call LLM via MCP
      const response = await this.callMcpLlm({
        prompt,
        temperature: 0.1,
        maxTokens: 500,
        task: 'parameter_extraction'
      });
      
      try {
        // Parse JSON response
        return JSON.parse(response.text);
      } catch (parseError) {
        console.error('Error parsing LLM response as JSON:', parseError);
        return {};
      }
    } catch (error: any) {
      console.error('Error extracting parameters:', error);
      return {};
    }
  }

  // Private methods for prompt building and response handling

  /**
   * Call LLM via MCP or directly if MCP is not available
   * @param params Parameters for the LLM call
   */
  private async callMcpLlm(params: {
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    task: string;
  }): Promise<{text: string; usage?: {total_tokens: number}}> {
    // Mock implementation for now
    // In a real implementation, this would use MCP to call an LLM
    
    // For now, simulate an API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock responses based on task
    const mockResponses: Record<string, string> = {
      'workflow_planning': JSON.stringify({
        steps: [
          { description: 'Fetch market data for specified assets', tool: 'exchange_data' },
          { description: 'Analyze price trends', tool: 'price_analysis' },
          { description: 'Generate sentiment analysis' },
          { description: 'Compile final report' }
        ]
      }),
      'step_analysis': 'Based on the current market data, BTC is showing a bullish pattern with increasing volume. Key support levels have been established at $50,800.',
      'workflow_summary': 'Market Analysis Complete: BTC shows bullish momentum with strong support at $50,800. ETH correlation remains high but technicals are slightly weaker. SOL demonstrates the strongest positive sentiment. Recommended: maintain BTC exposure, consider increasing SOL allocation.',
      'parameter_extraction': JSON.stringify({
        assets: ['BTC', 'ETH', 'SOL'],
        timeframe: '4h',
        metricType: 'price'
      })
    };
    
    return {
      text: mockResponses[params.task] || 'No mock response available for this task',
      usage: { total_tokens: 150 }
    };
  }

  /**
   * Build a prompt for workflow planning
   */
  private buildPlanningPrompt(
    agent: FarmAgent,
    workflowType: WorkflowType,
    input: string
  ): string {
    return `
You are an AI assistant helping a ${agent.type} agent plan a ${workflowType} workflow.

USER INPUT: ${input}

Please create a step-by-step plan to complete this workflow. Each step should include:
1. A clear description of the action to take
2. The tool to use (if applicable)
3. Parameters for the tool (if applicable)

Available tools: exchange_data, price_analysis, market_sentiment, trade_execution

Return the plan as a JSON array of steps.
    `;
  }

  /**
   * Build a prompt for step analysis
   */
  private buildStepAnalysisPrompt(
    agent: FarmAgent,
    workflowType: WorkflowType,
    input: string,
    stepDescription: string,
    previousSteps: Array<{description: string; result?: string}>
  ): string {
    // Format previous steps into a string
    const previousStepsText = previousSteps.map(step => 
      `Step: ${step.description}\nResult: ${step.result || 'N/A'}`
    ).join('\n\n');
    
    return `
You are an AI assistant helping a ${agent.type} agent with a ${workflowType} workflow.

USER INPUT: ${input}

PREVIOUS STEPS:
${previousStepsText}

CURRENT STEP: ${stepDescription}

Please provide a detailed analysis for the current step based on the previous steps and results.
    `;
  }

  /**
   * Build a prompt for workflow summary
   */
  private buildSummaryPrompt(
    agent: FarmAgent,
    workflowType: WorkflowType,
    input: string,
    steps: Array<{description: string; result?: string}>
  ): string {
    // Format steps into a string
    const stepsText = steps.map(step => 
      `Step: ${step.description}\nResult: ${step.result || 'N/A'}`
    ).join('\n\n');
    
    return `
You are an AI assistant helping a ${agent.type} agent summarize a completed ${workflowType} workflow.

USER INPUT: ${input}

WORKFLOW STEPS:
${stepsText}

Please provide a concise yet comprehensive summary of the workflow results, key findings, and recommended actions.
    `;
  }

  /**
   * Build a prompt for parameter extraction
   */
  private buildParameterExtractionPrompt(
    input: string,
    parameterSchema: Record<string, {type: string; description: string}>
  ): string {
    // Format parameter schema into a string
    const schemaText = Object.entries(parameterSchema)
      .map(([key, value]) => `${key}: ${value.type} - ${value.description}`)
      .join('\n');
    
    return `
You are an AI assistant tasked with extracting parameters from user input.

USER INPUT: ${input}

Please extract the following parameters:
${schemaText}

Return the parameters as a JSON object with the parameter names as keys and the extracted values.
    `;
  }

  /**
   * Parse the response from the LLM into a structured workflow plan
   */
  private parseWorkflowPlanResponse(
    response: {text: string; usage?: {total_tokens: number}},
    workflowType: WorkflowType
  ): LlmPlanResponse {
    try {
      // Try to parse the response as JSON
      const parsedResponse = JSON.parse(response.text);
      
      // Validate the response has the expected structure
      if (Array.isArray(parsedResponse.steps)) {
        return {
          success: true,
          steps: parsedResponse.steps
        };
      }
      
      throw new Error('Response does not contain a valid steps array');
    } catch (error: any) {
      console.error('Error parsing LLM plan response:', error);
      
      // Fallback to predefined plans if parsing fails
      return this.getFallbackPlan(workflowType);
    }
  }

  /**
   * Get a fallback plan if the LLM response parsing fails
   */
  private getFallbackPlan(workflowType: WorkflowType): LlmPlanResponse {
    // Predefined plans based on workflow type
    const fallbackPlans: Record<WorkflowType, Array<{description: string; tool?: string; params?: Record<string, any>}>> = {
      'MARKET_ANALYSIS': [
        { description: 'Fetch current market data for specified assets', tool: 'exchange_data', params: { dataType: 'market' } },
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
      steps: fallbackPlans[workflowType] || []
    };
  }
}

// Export singleton instance
export const llmService = LlmService.getInstance(); 