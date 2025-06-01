import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/database.types';

interface CommandResult {
  success: boolean;
  output: any;
  error?: string;
  retries?: number;
}

interface CommandAnalytics {
  command: string;
  duration: number;
  success: boolean;
  timestamp: string;
  agentId?: string;
  error?: string;
}

const VALID_COMMANDS = new Set([
  'status',
  'analyze',
  'trade',
  'cancel',
  'portfolio',
  'history'
]);

const TRADE_ACTIONS = new Set(['buy', 'sell', 'close']);

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

function validateCommand(command: string): void {
  const [action] = command.split(' ');
  
  if (!VALID_COMMANDS.has(action)) {
    throw new Error(`Invalid command: ${action}`);
  }
  
  if (action === 'trade') {
    const [, tradeAction] = command.split(' ');
    if (!TRADE_ACTIONS.has(tradeAction)) {
      throw new Error(`Invalid trade action: ${tradeAction}`);
    }
  }
}

export async function processCommands() {
  const supabase = createClient<Database>();
  
  // Get pending commands
  const { data: commands, error } = await supabase
    .from('elizaos_command_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5);

  if (error || !commands) return;

  for (const command of commands) {
    try {
      // Mark as processing
      await supabase
        .from('elizaos_command_queue')
        .update({ status: 'processing' })
        .eq('id', command.id);

      validateCommand(command.command);

      const result = await processWithRetry(command);

      if (result.success) {
        // Mark as completed
        await supabase
          .from('elizaos_command_queue')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            result: result.output 
          })
          .eq('id', command.id);
      } else {
        // Mark as failed
        await supabase
          .from('elizaos_command_queue')
          .update({ 
            status: 'failed',
            completed_at: new Date().toISOString(),
            result: { error: result.error }
          })
          .eq('id', command.id);
      }
    } catch (err) {
      await supabase
        .from('elizaos_command_queue')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          result: { error: err.message }
        })
        .eq('id', command.id);
    }
  }
}

async function processWithRetry(
  command: any
): Promise<CommandResult> {
  const startTime = Date.now();
  let attempts = 0;
  let lastError: Error;
  
  while (attempts < MAX_RETRIES) {
    try {
      const result = await executeCommand(command.command);
      await logCommandAnalytics({
        command: command.command,
        duration: Date.now() - startTime,
        success: true,
        timestamp: new Date().toISOString(),
        agentId: command.agent_id
      });
      return { success: true, output: result };
    } catch (error) {
      lastError = error;
      attempts++;
      await logCommandAnalytics({
        command: command.command,
        duration: Date.now() - startTime,
        success: false,
        timestamp: new Date().toISOString(),
        agentId: command.agent_id,
        error: error.message
      });
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempts));
    }
  }
  
  return { 
    success: false, 
    output: null,
    error: lastError.message,
    retries: attempts 
  };
}

async function logCommandAnalytics(analytics: CommandAnalytics) {
  const supabase = createClient<Database>();
  await supabase
    .from('command_analytics')
    .insert(analytics);
}

async function executeCommand(command: string): Promise<any> {
  const [action, ...params] = command.split(' ');
  validateCommand(command);

  switch (action) {
    case 'status':
      return { status: 'online', lastPing: new Date().toISOString() };
    
    case 'analyze':
      return analyzeMarket(params);
      
    case 'trade':
      return executeTradeCommand(params);

    case 'portfolio':
      return getPortfolio(params[0]); // Optional: symbol filter

    case 'history':
      return getTradeHistory(params[0]); // Optional: symbol filter
      
    default:
      throw new Error(`Unknown command: ${action}`);
  }
}

async function getPortfolio(symbol?: string) {
  // Mock implementation - would query exchange API
  return {
    holdings: [
      { symbol: 'BTC', amount: 0.5, value: 25000 },
      { symbol: 'ETH', amount: 10, value: 30000 }
    ].filter(h => !symbol || h.symbol === symbol),
    totalValue: 55000,
    timestamp: new Date().toISOString()
  };
}

async function getTradeHistory(symbol?: string) {
  // Mock implementation - would query exchange API
  return {
    trades: [
      { 
        id: 'trade_1', 
        symbol: 'BTC', 
        action: 'buy', 
        amount: 0.1,
        price: 49000,
        timestamp: new Date(Date.now() - 86400000).toISOString()
      }
    ].filter(t => !symbol || t.symbol === symbol)
  };
}

async function analyzeMarket(params: string[]) {
  // Mock implementation - would query exchange API
  return { analysis: 'Market conditions favorable', confidence: 0.85 };
}

async function executeTradeCommand(params: string[]): Promise<any> {
  const [action, symbol, amountStr] = params;
  const amount = parseFloat(amountStr);
  
  // Validate inputs
  if (!['buy', 'sell'].includes(action)) {
    throw new Error(`Invalid trade action: ${action}`);
  }
  
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid amount: ${amountStr}`);
  }
  
  // Get current market price
  const price = await getMarketPrice(symbol);
  
  // Execute trade (mock implementation)
  return {
    executed: true,
    action,
    symbol,
    amount,
    price,
    value: amount * price,
    timestamp: new Date().toISOString(),
    orderId: `order_${Math.random().toString(36).substring(2, 9)}`
  };
}

async function getMarketPrice(symbol: string): Promise<number> {
  // In a real implementation, this would fetch from exchange API
  const mockPrices: Record<string, number> = {
    'BTC': 50000,
    'ETH': 3000,
    'SOL': 100
  };
  
  return mockPrices[symbol] || 100;
}
