import { OpenAI } from 'langchain/llms/openai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { Anthropic } from 'langchain/llms/anthropic';
import { ChatAnthropic } from 'langchain/chat_models/anthropic';
import { PromptTemplate } from 'langchain/prompts';
import { LLMChain } from 'langchain/chains';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { 
  ChatPromptTemplate, 
  HumanMessagePromptTemplate, 
  SystemMessagePromptTemplate 
} from 'langchain/prompts';
import { HumanMessage, SystemMessage, AIMessage } from 'langchain/schema';
import { AI_CONFIG } from '../../config';
import logger from '../../utils/logger';

// Initialize OpenAI model
const openai = new OpenAI({
  modelName: AI_CONFIG.openai.defaultModel,
  openAIApiKey: AI_CONFIG.openai.apiKey,
  temperature: 0.7,
  maxTokens: AI_CONFIG.openai.maxTokens,
});

// Initialize ChatOpenAI model
const chatOpenAI = new ChatOpenAI({
  modelName: AI_CONFIG.openai.defaultModel,
  openAIApiKey: AI_CONFIG.openai.apiKey,
  temperature: 0.7,
  maxTokens: AI_CONFIG.openai.maxTokens,
});

// Initialize Anthropic model if API key is available
let anthropic: Anthropic | null = null;
let chatAnthropic: ChatAnthropic | null = null;

if (AI_CONFIG.anthropic.apiKey) {
  anthropic = new Anthropic({
    modelName: AI_CONFIG.anthropic.defaultModel,
    anthropicApiKey: AI_CONFIG.anthropic.apiKey,
    temperature: 0.7,
  });
  
  chatAnthropic = new ChatAnthropic({
    modelName: AI_CONFIG.anthropic.defaultModel,
    anthropicApiKey: AI_CONFIG.anthropic.apiKey,
    temperature: 0.7,
  });
}

// Create an output parser
const outputParser = new StringOutputParser();

/**
 * Generate text using the OpenAI model
 * @param prompt Prompt to generate text from
 * @returns Generated text
 */
export async function generateText(prompt: string): Promise<string> {
  try {
    const result = await openai.invoke(prompt);
    return result;
  } catch (error: any) {
    logger.error('Error generating text with OpenAI:', { error: error.message });
    throw new Error(`AI text generation failed: ${error.message}`);
  }
}

/**
 * Generate text using a structured prompt template
 * @param template Prompt template with variables
 * @param variables Variables to fill in the template
 * @returns Generated text
 */
export async function generateFromTemplate(
  template: string,
  variables: Record<string, string>
): Promise<string> {
  try {
    const promptTemplate = new PromptTemplate({
      template,
      inputVariables: Object.keys(variables),
    });
    
    const chain = new LLMChain({
      llm: openai,
      prompt: promptTemplate,
      outputParser,
    });
    
    const result = await chain.invoke(variables);
    return result.text;
  } catch (error: any) {
    logger.error('Error generating from template:', { error: error.message, template, variables });
    throw new Error(`AI template generation failed: ${error.message}`);
  }
}

/**
 * Chat with an AI model
 * @param messages Array of messages (system, human, ai)
 * @param model Model to use ('openai' or 'anthropic')
 * @returns AI response text
 */
export async function chat(
  messages: Array<{ role: 'system' | 'human' | 'ai'; content: string }>,
  model: 'openai' | 'anthropic' = 'openai'
): Promise<string> {
  try {
    // Convert messages to LangChain format
    const langchainMessages = messages.map(msg => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'human':
          return new HumanMessage(msg.content);
        case 'ai':
          return new AIMessage(msg.content);
        default:
          throw new Error(`Unknown message role: ${msg.role}`);
      }
    });
    
    // Choose the model to use
    const chatModel = model === 'anthropic' && chatAnthropic ? chatAnthropic : chatOpenAI;
    
    // Generate response
    const response = await chatModel.invoke(langchainMessages);
    return response.content as string;
  } catch (error: any) {
    logger.error('Error in chat:', { error: error.message, model });
    throw new Error(`AI chat failed: ${error.message}`);
  }
}

/**
 * Generate a trading strategy from description
 * @param description Strategy description
 * @param timeframe Trading timeframe
 * @param assetType Type of asset to trade
 * @returns Generated strategy code
 */
export async function generateStrategy(
  description: string,
  timeframe: string,
  assetType: string
): Promise<string> {
  try {
    const chatPrompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(
        'You are an expert trading strategy developer. Create a precise, efficient strategy based on the user\'s description. ' +
        'Use proper syntax and include clear entry/exit conditions. The strategy should be clear and executable.'
      ),
      HumanMessagePromptTemplate.fromTemplate(
        'Create a trading strategy with the following parameters:\n' +
        'Description: {description}\n' +
        'Timeframe: {timeframe}\n' +
        'Asset Type: {assetType}\n\n' +
        'Return only the code without additional explanations.'
      ),
    ]);
    
    const chain = new LLMChain({
      llm: chatOpenAI,
      prompt: chatPrompt,
      outputParser,
    });
    
    const result = await chain.invoke({
      description,
      timeframe,
      assetType,
    });
    
    return result.text;
  } catch (error: any) {
    logger.error('Error generating strategy:', { 
      error: error.message, 
      description, 
      timeframe, 
      assetType 
    });
    throw new Error(`Strategy generation failed: ${error.message}`);
  }
}

/**
 * Analyze market data and generate insights
 * @param marketData Market data to analyze
 * @returns Analysis and insights
 */
export async function analyzeMarket(marketData: string): Promise<string> {
  try {
    const chatPrompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(
        'You are a financial market analyst. Analyze the provided market data and provide clear, actionable insights. ' +
        'Focus on key patterns, potential trade setups, and notable market conditions.'
      ),
      HumanMessagePromptTemplate.fromTemplate(
        'Analyze the following market data and provide insights:\n\n{marketData}'
      ),
    ]);
    
    const chain = new LLMChain({
      llm: chatOpenAI,
      prompt: chatPrompt,
      outputParser,
    });
    
    const result = await chain.invoke({
      marketData,
    });
    
    return result.text;
  } catch (error: any) {
    logger.error('Error analyzing market:', { error: error.message });
    throw new Error(`Market analysis failed: ${error.message}`);
  }
}

/**
 * Generate risk assessment for a trading strategy
 * @param strategyCode Strategy code to assess
 * @returns Risk assessment report
 */
export async function assessStrategyRisk(strategyCode: string): Promise<string> {
  try {
    const chatPrompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(
        'You are a risk management expert for trading strategies. Analyze the given strategy code and provide a comprehensive ' +
        'risk assessment. Identify potential issues, edge cases, and suggest improvements to manage risk.'
      ),
      HumanMessagePromptTemplate.fromTemplate(
        'Assess the risks in the following trading strategy:\n\n```\n{strategyCode}\n```'
      ),
    ]);
    
    const chain = new LLMChain({
      llm: chatOpenAI,
      prompt: chatPrompt,
      outputParser,
    });
    
    const result = await chain.invoke({
      strategyCode,
    });
    
    return result.text;
  } catch (error: any) {
    logger.error('Error assessing strategy risk:', { error: error.message });
    throw new Error(`Risk assessment failed: ${error.message}`);
  }
}

export default {
  generateText,
  generateFromTemplate,
  chat,
  generateStrategy,
  analyzeMarket,
  assessStrategyRisk,
}; 