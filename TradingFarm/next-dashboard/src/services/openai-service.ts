import OpenAI from 'openai';
import { Agent, AgentAction, AgentInstruction, TradingAgent } from '@/types/ai-agent';

// Initialize the OpenAI client
// Note: In production, use environment variables for API keys
const createOpenAIClient = (apiKey?: string) => {
  return new OpenAI({
    apiKey: apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
    dangerouslyAllowBrowser: true, // For client-side use, consider server endpoints for production
  });
};

export class OpenAIAgentService {
  private client: OpenAI;
  
  constructor(apiKey?: string) {
    this.client = createOpenAIClient(apiKey);
  }

  // Analyze market data using GPT-4
  async analyzeMarket(symbol: string, timeframe: string, historicalData: any) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a professional trading analyst specialized in ${symbol} markets. 
            Analyze the provided market data and provide insights on trends, patterns, 
            potential entry/exit points, and risk assessment. Be concise and focus on actionable information.`
          },
          {
            role: 'user',
            content: `Analyze the following ${timeframe} data for ${symbol}: 
            ${JSON.stringify(historicalData, null, 2)}`
          }
        ],
        temperature: 0.2,
      });

      return {
        analysis: response.choices[0].message.content,
        timestamp: new Date(),
        symbol,
        timeframe,
      };
    } catch (error) {
      console.error('Error analyzing market data:', error);
      throw new Error('Failed to analyze market data');
    }
  }

  // Generate trading strategy recommendations
  async generateTradingStrategy(
    agentType: string, 
    riskTolerance: 'low' | 'medium' | 'high', 
    preferences: string[]
  ) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an advanced trading strategy developer. 
            Create detailed trading strategies based on the user's preferences, 
            risk tolerance, and chosen methodology. Include entry/exit criteria, 
            position sizing, risk management rules, and key performance indicators.`
          },
          {
            role: 'user',
            content: `Generate a ${agentType} trading strategy with ${riskTolerance} risk tolerance. 
            Focus on these aspects: ${preferences.join(', ')}.`
          }
        ],
        temperature: 0.3,
      });

      return {
        strategy: response.choices[0].message.content,
        created_at: new Date(),
        agent_type: agentType,
        risk_tolerance: riskTolerance,
      };
    } catch (error) {
      console.error('Error generating trading strategy:', error);
      throw new Error('Failed to generate trading strategy');
    }
  }

  // Process natural language instructions for trading agents
  async processAgentInstruction(
    agent: TradingAgent,
    instruction: string
  ): Promise<AgentInstruction> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are ${agent.name}, a trading agent with the following capabilities: 
            ${agent.capabilities.join(', ')}. 
            Your specialization includes: ${agent.specialization.join(', ')}.
            Your risk tolerance is ${agent.risk_tolerance}.
            Process the user's instruction and respond with how you would execute it, 
            what information you would need, and any clarifications required.`
          },
          {
            role: 'user',
            content: instruction
          }
        ],
        temperature: 0.2,
      });

      return {
        id: Math.random().toString(36).substring(2, 15),
        agent_id: agent.id,
        instruction: instruction,
        created_at: new Date(),
        status: 'processed',
        response: response.choices[0].message.content || '',
        metadata: {}
      };
    } catch (error) {
      console.error('Error processing agent instruction:', error);
      throw new Error('Failed to process agent instruction');
    }
  }

  // Generate market reports
  async generateMarketReport(symbols: string[], timeframe: string) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a comprehensive market analyst. Generate a detailed market report 
            for the specified symbols and timeframe. Include price analysis, volume patterns, 
            key support/resistance levels, and overall market sentiment.`
          },
          {
            role: 'user',
            content: `Generate a ${timeframe} market report for these symbols: ${symbols.join(', ')}.`
          }
        ],
        temperature: 0.2,
      });

      return {
        report: response.choices[0].message.content,
        created_at: new Date(),
        symbols,
        timeframe,
      };
    } catch (error) {
      console.error('Error generating market report:', error);
      throw new Error('Failed to generate market report');
    }
  }

  // Analyze risk for a potential trade
  async analyzeTradeRisk(symbol: string, entry: number, stopLoss: number, target: number, position: number) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a risk management specialist for trading operations. 
            Analyze the proposed trade and provide a comprehensive risk assessment. 
            Consider risk-reward ratio, position sizing relative to portfolio, 
            market volatility factors, and overall exposure.`
          },
          {
            role: 'user',
            content: `Analyze risk for this trade:
            Symbol: ${symbol}
            Entry: ${entry}
            Stop Loss: ${stopLoss}
            Target: ${target}
            Position Size: ${position}`
          }
        ],
        temperature: 0.1,
      });

      return {
        risk_analysis: response.choices[0].message.content,
        timestamp: new Date(),
        trade_details: {
          symbol,
          entry,
          stopLoss,
          target,
          position,
          risk_reward: (target - entry) / (entry - stopLoss),
        }
      };
    } catch (error) {
      console.error('Error analyzing trade risk:', error);
      throw new Error('Failed to analyze trade risk');
    }
  }
}

export default OpenAIAgentService;
