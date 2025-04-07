/**
 * Represents a tool that an agent can use.
 * A tool is essentially a function that performs an action and returns a result.
 */
import { AgentTool, ToolDefinition, ToolParameterDefinition } from "@/types/agentTypes";

/**
 * Defines the interface for managing agent tools.
 */
export interface AgentTools {
  /**
   * Retrieves a tool function by its name.
   * @param name The name of the tool.
   * @returns The tool function, or undefined if not found.
   */
  getTool(name: string): AgentTool | undefined;

  /**
   * Registers a new tool or updates an existing one.
   * @param name The name of the tool.
   * @param tool The tool function.
   */
  registerTool(name: string, tool: AgentTool): void;

  /**
   * Unregisters a tool.
   * @param name The name of the tool to remove.
   */
  unregisterTool(name: string): boolean;

  /**
   * Lists the names of all available tools.
   * @returns An array of tool names.
   */
  listTools(): string[];

  /**
   * Executes a tool with the given arguments.
   * @param toolName The name of the tool to execute.
   * @param args The arguments to pass to the tool.
   * @returns The result of the tool execution.
   */
  executeTool(toolName: string, args: any): Promise<any>;
}

// --- Concrete Tool Implementations (Examples) ---

const tradingPlatformTool: AgentTool = {
  definition: {
    name: "tradingPlatform",
    description: "Executes buy or sell orders on a trading platform.",
    parameters: {
      symbol: { type: "string", description: "The trading symbol (e.g., BTC/USD)", required: true },
      amount: { type: "number", description: "The amount to trade", required: true },
      type: { type: "string", description: "Order type: 'buy' or 'sell'", required: true },
      orderType: { type: "string", description: "Order type: 'market' or 'limit'", required: false },
      price: { type: "number", description: "Limit price (required if orderType is 'limit')", required: false }
    },
  },
  async execute(args: { 
      symbol: string; 
      amount: number; 
      type: 'buy' | 'sell'; 
      orderType?: 'market' | 'limit'; 
      price?: number;
      [key: string]: any 
  }): Promise<any> {
    console.log(`[TradingTool] Preparing ${args.type} order for ${args.amount} ${args.symbol}...`, args);
    
    // Input Validation
    if (args.orderType === 'limit' && typeof args.price !== 'number') {
      console.error('[TradingTool] Limit price is required for limit orders.');
      return { success: false, error: "Limit price required for limit order." };
    }

    // ** REPLACE WITH ACTUAL SDK/API CALL **
    // Example using a hypothetical SDK `tradingSDK`
    /*
    try {
        const sdkPayload = {
            symbol: args.symbol,
            quantity: args.amount,
            side: args.type,
            type: args.orderType || 'market',
            price: args.price, // SDK might ignore if type is market
            // ... other necessary parameters for the SDK
        };
        const result = await tradingSDK.createOrder(sdkPayload);
        console.log(`[TradingTool] API Response:`, result);
        
        if (result.status === 'filled' || result.status === 'accepted') {
            return { success: true, orderId: result.id, status: result.status };
        } else {
            return { success: false, error: `Order status: ${result.status}`, details: result };
        }
    } catch (apiError: any) {
        console.error('[TradingTool] API Error during order execution:', apiError);
        return { success: false, error: apiError.message || "Failed to execute trade via SDK" };
    }
    */
    
    // --- Simulated Logic (Remove when using real API) ---
    console.warn('[TradingTool] Using simulated execution.');
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API latency
    if (Math.random() < 0.1) { 
        console.error('[TradingTool] Simulated order execution failure.');
        return { success: false, error: "Simulated exchange connection error" };
    }
    const orderId = `SIM_ORDER_${Date.now()}`;
    console.log(`[TradingTool] Simulated order executed successfully. Order ID: ${orderId}`);
    return { success: true, orderId: orderId, status: 'simulated_filled' };
    // --- End Simulated Logic ---
  },
};

const dataCruncherTool: AgentTool = {
  definition: {
    name: "dataCruncher",
    description: "Performs complex data analysis on provided datasets.",
    parameters: {
      data: { type: "object", description: "The data object or array to analyze", required: true },
      analysisType: { type: "string", description: "Type of analysis (e.g., 'trend', 'correlation', 'sentiment')", required: true },
      config: { type: "object", description: "Analysis-specific configuration", required: false },
    },
  },
  async execute(args: { data: any; analysisType: string; config?: any }): Promise<any> {
    console.log(`[DataCruncher] Starting analysis (type: ${args.analysisType})...`, args.config);

    // ** REPLACE WITH ACTUAL ANALYSIS LOGIC/LIBRARY CALLS **
    /*
    try {
        let resultData;
        switch (args.analysisType) {
            case 'trend':
                // resultData = await TrendAnalysisLibrary.analyze(args.data, args.config);
                break;
            case 'correlation':
                // resultData = await CorrelationLibrary.find(args.data, args.config);
                break;
            case 'sentiment':
                // resultData = await SentimentApi.analyzeText(args.data, args.config);
                 break;
            default:
                throw new Error(`Unsupported analysis type: ${args.analysisType}`);
        }
        console.log('[DataCruncher] Analysis complete.');
        return { success: true, summary: `${args.analysisType} analysis complete.`, results: resultData };
        
    } catch (analysisError: any) {
        console.error(`[DataCruncher] Error during ${args.analysisType} analysis:`, analysisError);
        return { success: false, error: `Analysis failed: ${analysisError.message}` };
    }
    */

    // --- Simulated Logic (Remove when using real logic) ---
    console.warn('[DataCruncher] Using simulated analysis.');
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate complex computation
    console.log('[DataCruncher] Simulated analysis complete.');
    return { 
        success: true, 
        summary: `Simulated ${args.analysisType} analysis complete.`, 
        results: { 
            processedItems: Array.isArray(args.data) ? args.data.length : 1, 
            mockScore: Math.random()
        } 
    };
    // --- End Simulated Logic ---
  },
};

const notifierTool: AgentTool = {
  definition: {
    name: "notifier",
    description: "Sends notifications via specified channels.",
    parameters: {
      channel: { type: "string", description: "Notification channel (e.g., 'email', 'sms', 'slack')", required: true },
      recipient: { type: "string", description: "Recipient address/ID (e.g., email address, phone number, Slack user ID)", required: true },
      message: { type: "string", description: "The message content (text or potentially structured object)", required: true },
      subject: { type: "string", description: "Subject line (for email)", required: false },
    },
  },
  async execute(args: { channel: string; recipient: string; message: string; subject?: string }): Promise<any> {
    console.log(`[Notifier] Preparing notification via ${args.channel} to ${args.recipient}...`);

    // ** REPLACE WITH ACTUAL NOTIFICATION API/SDK CALLS **
    /* 
    try {
        let apiResponse;
        switch (args.channel.toLowerCase()) {
            case 'email':
                // Example: Using a hypothetical email service SDK
                // apiResponse = await EmailService.send({
                //    to: args.recipient,
                //    subject: args.subject || 'Agent Notification',
                //    body: args.message // Could be HTML or text
                // });
                if (!args.subject) console.warn('[Notifier] Subject recommended for email channel.');
                 break;
            case 'sms':
                // Example: Using a hypothetical Twilio-like SDK
                // apiResponse = await SmsService.send({
                //     to: args.recipient,
                //     body: args.message
                // });
                break;
            case 'slack':
                 // Example: Calling Slack API
                 // apiResponse = await SlackApi.postMessage({
                 //    channel: args.recipient, // Could be channel ID or user ID
                 //    text: args.message
                 // });
                 break;
            default:
                throw new Error(`Unsupported notification channel: ${args.channel}`);
        }
        console.log(`[Notifier] API Response:`, apiResponse);
        // Check apiResponse structure for success/failure
        // const success = apiResponse?.status === 'delivered' || apiResponse?.ok === true;
        // if (success) {
             return { success: true, deliveryStatus: apiResponse?.status || 'sent_to_api' };
        // } else {
        //     return { success: false, error: apiResponse?.error || 'Failed to send via API' };
        // }

    } catch (apiError: any) {
        console.error(`[Notifier] Error sending notification via ${args.channel}:`, apiError);
        return { success: false, error: apiError.message || `Failed to send ${args.channel} notification` };
    }
    */

    // --- Simulated Logic (Remove when using real APIs) ---
    console.warn('[Notifier] Using simulated notification sending.');
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate API call
    console.log(`[Notifier] Simulated notification sent via ${args.channel}.`);
    return { success: true, deliveryStatus: "simulated_sent" };
    // --- End Simulated Logic ---
  },
};

// --- Tool Registry Implementation ---

/**
 * A simple implementation of AgentTools using an in-memory map.
 */
export class ToolRegistry implements AgentTools {
  private tools: Map<string, AgentTool> = new Map();

  constructor() {
    // Register the example tools upon initialization
    this.registerTool(tradingPlatformTool.definition.name, tradingPlatformTool);
    this.registerTool(dataCruncherTool.definition.name, dataCruncherTool);
    this.registerTool(notifierTool.definition.name, notifierTool);
    console.log("AgentTools initialized and default tools registered.");
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  registerTool(name: string, tool: AgentTool): void {
    if (this.tools.has(name)) {
      console.warn(`Tool "${name}" is already registered. Overwriting.`);
    }
    this.tools.set(name, tool);
    console.log(`Tool "${name}" registered.`);
  }

  unregisterTool(name: string): boolean {
    const deleted = this.tools.delete(name);
    if (deleted) {
      console.log(`Tool "${name}" unregistered.`);
    }
    return deleted;
  }

  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  // Updated executeTool to correctly handle argument validation and defaults
  async executeTool(toolName: string, args: any): Promise<any> {
    const tool = this.getTool(toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found.`);
    }

    // Prepare arguments, applying defaults and validating required params
    const preparedArgs: { [key: string]: any } = { ...args }; // Clone args
    for (const paramName in tool.definition.parameters) {
        const paramDef = tool.definition.parameters[paramName];
        
        // Apply default if parameter is missing (handle standard defaults here)
        if (!(paramName in preparedArgs)) {
            // ** Set common default values based on definition if needed ** 
            // Example: if (paramDef.type === 'string' && !paramDef.required) { preparedArgs[paramName] = ''; } 
            // Specifically for orderType:
            if (paramName === 'orderType' && toolName === 'tradingPlatform') {
                 preparedArgs[paramName] = 'market'; // Apply default for this specific tool/param
                 console.log(`[ToolRegistry] Applied default value 'market' for missing 'orderType' in ${toolName}`);
            }
        }

        // Check if required parameter is still missing after potential default application
        if (paramDef.required && !(paramName in preparedArgs)) {
            throw new Error(`Missing required parameter "${paramName}" for tool "${toolName}".`);
        }

        // Basic type checking example (can be expanded)
        if (paramName in preparedArgs && paramDef.type !== 'object' && paramDef.type !== 'array') {
            const argType = typeof preparedArgs[paramName];
            // Allow number type for string schema if it parses correctly (flexible for numbers passed as strings)
            // Or allow string type for number schema if it parses correctly
             let typeMatch = argType === paramDef.type;
             if (!typeMatch && paramDef.type === 'number' && argType === 'string' && !isNaN(Number(preparedArgs[paramName]))) {
                 // Attempt conversion if types mismatch but are convertible (string to number)
                 preparedArgs[paramName] = Number(preparedArgs[paramName]);
                 typeMatch = true; 
             } else if (!typeMatch && paramDef.type === 'string' && argType === 'number') {
                 // Allow numbers to be passed for string params
                  preparedArgs[paramName] = String(preparedArgs[paramName]);
                 typeMatch = true; 
             }

            if (!typeMatch) {
                 console.warn(`[ToolRegistry] Type mismatch for param "${paramName}" in tool "${toolName}". Expected ${paramDef.type}, got ${argType}. Tool execution might fail.`);
            }
        } 
        // Add more robust validation for object/array types if needed
    }

    try {
      console.log(`Executing tool "${toolName}" with prepared args:`, preparedArgs);
      // Directly call the tool's own execute method with prepared args
      const result = await tool.execute(preparedArgs);
      console.log(`Tool "${toolName}" execution result:`, result);
      // Optionally, validate result structure here based on tool definition
      return result;
    } catch (error: any) {
      console.error(`Error executing tool "${toolName}":`, error);
      return { success: false, error: `Failed to execute tool "${toolName}": ${error.message}` }; 
    }
  }
} 