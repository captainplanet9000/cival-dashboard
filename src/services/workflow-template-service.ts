import { WorkflowType } from '@/components/agents/AgentWorkflow';
import { FarmAgent } from './farm/farm-service';

// Template parameter definition
interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'asset' | 'assets' | 'timeframe' | 'percentage';
  description: string;
  required: boolean;
  default?: any;
  options?: string[]; // For enum-like parameters
}

// Workflow template definition
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  type: WorkflowType;
  agentTypes: string[]; // Which agent types can use this template
  parameters: TemplateParameter[];
  prompt: string; // Template string with parameter placeholders like {{paramName}}
  featured?: boolean; // Whether this is a featured template
  tags?: string[]; // For categorization
}

// Parameter values for a template
export interface TemplateParameterValues {
  [key: string]: any;
}

/**
 * WorkflowTemplateService - Manages predefined workflow templates and their parameters
 */
class WorkflowTemplateService {
  private static instance: WorkflowTemplateService;
  private templates: WorkflowTemplate[] = [];

  private constructor() {
    this.initializeTemplates();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): WorkflowTemplateService {
    if (!WorkflowTemplateService.instance) {
      WorkflowTemplateService.instance = new WorkflowTemplateService();
    }
    return WorkflowTemplateService.instance;
  }

  /**
   * Get all available templates
   */
  public getTemplates(): WorkflowTemplate[] {
    return this.templates;
  }

  /**
   * Get templates filtered by agent type
   * @param agentType The type of agent to filter templates for
   */
  public getTemplatesByAgentType(agentType: string): WorkflowTemplate[] {
    return this.templates.filter(template => 
      template.agentTypes.includes(agentType.toUpperCase())
    );
  }

  /**
   * Get a specific template by ID
   * @param templateId The ID of the template to retrieve
   */
  public getTemplateById(templateId: string): WorkflowTemplate | undefined {
    return this.templates.find(template => template.id === templateId);
  }

  /**
   * Apply template parameters to generate a prompt for the workflow
   * @param templateId The ID of the template to use
   * @param paramValues Values for the template parameters
   */
  public applyTemplate(
    templateId: string, 
    paramValues: TemplateParameterValues
  ): string {
    const template = this.getTemplateById(templateId);
    
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }
    
    // Validate required parameters
    const missingParams = template.parameters
      .filter(param => param.required && !paramValues.hasOwnProperty(param.name))
      .map(param => param.name);
    
    if (missingParams.length > 0) {
      throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }
    
    // Apply default values for missing optional parameters
    const allParamValues = { ...paramValues };
    template.parameters.forEach(param => {
      if (!allParamValues.hasOwnProperty(param.name) && param.default !== undefined) {
        allParamValues[param.name] = param.default;
      }
    });
    
    // Replace placeholders in the template string
    let prompt = template.prompt;
    Object.entries(allParamValues).forEach(([key, value]) => {
      // Handle arrays by joining with commas
      const valueStr = Array.isArray(value) ? value.join(', ') : String(value);
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), valueStr);
    });
    
    return prompt;
  }

  /**
   * Check if a template is compatible with an agent
   * @param templateId The ID of the template to check
   * @param agent The agent to check compatibility with
   */
  public isTemplateCompatibleWithAgent(
    templateId: string,
    agent: FarmAgent
  ): boolean {
    const template = this.getTemplateById(templateId);
    
    if (!template || !agent.type) {
      return false;
    }
    
    return template.agentTypes.includes(agent.type.toUpperCase());
  }

  /**
   * Initialize the predefined templates
   */
  private initializeTemplates(): void {
    // Market Analysis Templates
    this.templates.push({
      id: 'market_analysis_basic',
      name: 'Basic Market Analysis',
      description: 'Analyze current market conditions for specific assets',
      type: 'MARKET_ANALYSIS',
      agentTypes: ['ANALYST', 'TRADER'],
      featured: true,
      tags: ['analysis', 'market', 'beginner'],
      parameters: [
        {
          name: 'assets',
          type: 'assets',
          description: 'Assets to analyze',
          required: true
        },
        {
          name: 'timeframe',
          type: 'timeframe',
          description: 'Analysis timeframe',
          required: true,
          default: '1d',
          options: ['15m', '1h', '4h', '1d', '1w']
        }
      ],
      prompt: 'Analyze the current market conditions for {{assets}} on the {{timeframe}} timeframe. Focus on price action, volume, and key support/resistance levels.'
    });

    this.templates.push({
      id: 'market_analysis_advanced',
      name: 'Advanced Technical Analysis',
      description: 'Perform comprehensive technical analysis with multiple indicators',
      type: 'MARKET_ANALYSIS',
      agentTypes: ['ANALYST'],
      tags: ['analysis', 'technical', 'advanced'],
      parameters: [
        {
          name: 'assets',
          type: 'assets',
          description: 'Assets to analyze',
          required: true
        },
        {
          name: 'timeframe',
          type: 'timeframe',
          description: 'Analysis timeframe',
          required: true,
          options: ['1h', '4h', '1d', '1w']
        },
        {
          name: 'indicators',
          type: 'string',
          description: 'Technical indicators to use',
          required: false,
          default: 'RSI, MACD, Bollinger Bands'
        }
      ],
      prompt: 'Perform a comprehensive technical analysis for {{assets}} on the {{timeframe}} timeframe. Include the following indicators: {{indicators}}. Identify potential entry and exit points, trend direction, and key levels.'
    });

    // Risk Assessment Templates
    this.templates.push({
      id: 'risk_assessment_portfolio',
      name: 'Portfolio Risk Assessment',
      description: 'Evaluate risk exposure for your current portfolio',
      type: 'RISK_ASSESSMENT',
      agentTypes: ['ANALYST', 'MONITOR'],
      featured: true,
      tags: ['risk', 'portfolio'],
      parameters: [
        {
          name: 'riskTolerance',
          type: 'string',
          description: 'Your risk tolerance level',
          required: true,
          options: ['Low', 'Medium', 'High']
        },
        {
          name: 'marketCondition',
          type: 'string',
          description: 'Current market condition',
          required: false,
          default: 'Normal',
          options: ['Bullish', 'Bearish', 'Volatile', 'Normal']
        }
      ],
      prompt: 'Evaluate the risk exposure for my current portfolio. I have a {{riskTolerance}} risk tolerance and believe the market is currently {{marketCondition}}. Provide risk metrics, correlation analysis, and suggestions for hedging or adjusting positions.'
    });

    // Trade Execution Templates
    this.templates.push({
      id: 'trade_execution_entry',
      name: 'Execute Market Entry',
      description: 'Execute a market entry based on specified parameters',
      type: 'TRADE_EXECUTION',
      agentTypes: ['TRADER'],
      featured: true,
      tags: ['trade', 'entry', 'execution'],
      parameters: [
        {
          name: 'asset',
          type: 'asset',
          description: 'Asset to trade',
          required: true
        },
        {
          name: 'direction',
          type: 'string',
          description: 'Trade direction',
          required: true,
          options: ['Long', 'Short']
        },
        {
          name: 'percentage',
          type: 'percentage',
          description: 'Percentage of available capital to use',
          required: true,
          default: 5
        },
        {
          name: 'stopLossPercent',
          type: 'percentage',
          description: 'Stop loss percentage',
          required: false,
          default: 2
        },
        {
          name: 'takeProfitPercent',
          type: 'percentage',
          description: 'Take profit percentage',
          required: false,
          default: 5
        }
      ],
      prompt: 'Execute a {{direction}} market entry for {{asset}} using {{percentage}}% of available capital. Set stop loss at {{stopLossPercent}}% and take profit at {{takeProfitPercent}}%. Find the best execution price and minimize slippage.'
    });

    // Portfolio Rebalance Templates
    this.templates.push({
      id: 'portfolio_rebalance_standard',
      name: 'Standard Portfolio Rebalance',
      description: 'Rebalance portfolio to target allocations',
      type: 'PORTFOLIO_REBALANCE',
      agentTypes: ['TRADER'],
      tags: ['portfolio', 'rebalance'],
      parameters: [
        {
          name: 'targetAllocations',
          type: 'string',
          description: 'Target allocations as percentages',
          required: true,
          default: 'BTC:40%, ETH:30%, SOL:20%, USDC:10%'
        },
        {
          name: 'maxSlippage',
          type: 'percentage',
          description: 'Maximum allowed slippage',
          required: false,
          default: 0.5
        }
      ],
      prompt: "Rebalance my portfolio to the following target allocations: {{targetAllocations}}. Use market orders but ensure slippage doesn't exceed {{maxSlippage}}%. Prioritize rebalancing the most out-of-balance assets first."
    });

    // Market Sentiment Templates
    this.templates.push({
      id: 'market_sentiment_analysis',
      name: 'Market Sentiment Analysis',
      description: 'Analyze sentiment across news and social media',
      type: 'MARKET_ANALYSIS',
      agentTypes: ['ANALYST', 'MONITOR'],
      tags: ['sentiment', 'social', 'news'],
      parameters: [
        {
          name: 'assets',
          type: 'assets',
          description: 'Assets to analyze sentiment for',
          required: true
        },
        {
          name: 'sources',
          type: 'string',
          description: 'Sources to include',
          required: false,
          default: 'Twitter, Reddit, News',
          options: ['Twitter', 'Reddit', 'News', 'Telegram', 'YouTube']
        }
      ],
      prompt: 'Analyze the market sentiment for {{assets}} across the following sources: {{sources}}. Identify sentiment trends, key topics of discussion, and any significant sentiment shifts in the past 24 hours.'
    });
  }
}

// Export singleton instance
export const workflowTemplateService = WorkflowTemplateService.getInstance(); 