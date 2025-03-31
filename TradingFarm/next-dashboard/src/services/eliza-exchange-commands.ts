/**
 * ElizaOS Exchange Command Integration
 * 
 * Integrates ElizaOS command system with exchange APIs
 * Provides commands for trading, market data, and account management
 */
import { ElizaTerminalType } from '@/components/eliza-terminal';
import { ExchangeType } from './exchange-service';
import exchangeService from './exchange-service';
import exchangeCredentialsService from './exchange-credentials-service';
import exchangeWebSocketService, { ExchangeDataType } from './exchange-websocket-service';
import { WebSocketTopic } from './websocket-service';
import websocketService from './websocket-service';

// Command result type
export type CommandResult = {
  success: boolean;
  message: string;
  data?: any;
}

// Register exchange commands with ElizaOS
export function registerExchangeCommands(terminal: ElizaTerminalType) {
  // Market data commands
  terminal.registerCommand('market', handleMarketCommand, 'Get market data. Usage: market [symbol] [options]');
  terminal.registerCommand('ticker', handleTickerCommand, 'Get current ticker data. Usage: ticker [symbol] [exchange]');
  terminal.registerCommand('orderbook', handleOrderbookCommand, 'View order book. Usage: orderbook [symbol] [exchange] [depth]');
  terminal.registerCommand('trades', handleTradesCommand, 'View recent trades. Usage: trades [symbol] [exchange] [limit]');
  
  // Exchange account commands
  terminal.registerCommand('balance', handleBalanceCommand, 'Check account balance. Usage: balance [exchange]');
  terminal.registerCommand('positions', handlePositionsCommand, 'View open positions. Usage: positions [exchange]');
  
  // Trading commands
  terminal.registerCommand('order', handleOrderCommand, 'Place order. Usage: order [buy|sell] [symbol] [quantity] [price (optional for market)]');
  terminal.registerCommand('cancel', handleCancelCommand, 'Cancel order. Usage: cancel [orderId] [exchange]');
  terminal.registerCommand('orders', handleOrdersCommand, 'List open orders. Usage: orders [exchange] [symbol]');
  
  // Exchange credentials commands
  terminal.registerCommand('exchanges', handleExchangesCommand, 'List configured exchanges. Usage: exchanges');
  terminal.registerCommand('connect', handleConnectCommand, 'Connect to exchange WebSocket. Usage: connect [exchange]');
  
  // WebSocket commands
  terminal.registerCommand('subscribe', handleSubscribeCommand, 'Subscribe to WebSocket data. Usage: subscribe [exchange] [symbol] [type]');
  terminal.registerCommand('unsubscribe', handleUnsubscribeCommand, 'Unsubscribe from WebSocket data. Usage: unsubscribe [exchange] [symbol] [type]');
}

// Format data for terminal output
function formatData(data: any, format: 'table' | 'json' | 'text' = 'table'): string {
  if (!data) return 'No data available';
  
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }
  
  if (format === 'text') {
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  }
  
  // Table format (default)
  if (Array.isArray(data)) {
    if (data.length === 0) return 'No data available';
    
    // Extract headers from first object
    const headers = Object.keys(data[0]);
    
    // Create header row
    let table = headers.join('\t') + '\n';
    table += headers.map(() => '------').join('\t') + '\n';
    
    // Add rows
    data.forEach(row => {
      table += headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return value.toString();
      }).join('\t') + '\n';
    });
    
    return table;
  } else if (typeof data === 'object') {
    // Convert object to array of key-value pairs
    const entries = Object.entries(data);
    let table = 'Key\tValue\n------\t------\n';
    
    entries.forEach(([key, value]) => {
      const valueStr = 
        value === null || value === undefined 
          ? '' 
          : typeof value === 'object' 
            ? JSON.stringify(value) 
            : value.toString();
      table += `${key}\t${valueStr}\n`;
    });
    
    return table;
  }
  
  return data.toString();
}

// Get exchange type from string (with fallback to default)
function getExchangeFromArg(arg?: string): ExchangeType {
  if (!arg) return 'bybit';
  
  if (['bybit', 'coinbase', 'hyperliquid', 'mock'].includes(arg.toLowerCase())) {
    return arg.toLowerCase() as ExchangeType;
  }
  
  return 'bybit';
}

// Parse flags from command arguments (e.g., --json, --limit=10)
function parseFlags(args: string[]): { flags: Record<string, string | boolean>, remainingArgs: string[] } {
  const flags: Record<string, string | boolean> = {};
  const remainingArgs: string[] = [];
  
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const flagParts = arg.substring(2).split('=');
      if (flagParts.length === 2) {
        flags[flagParts[0]] = flagParts[1];
      } else {
        flags[flagParts[0]] = true;
      }
    } else {
      remainingArgs.push(arg);
    }
  });
  
  return { flags, remainingArgs };
}

// Market data command handler
async function handleMarketCommand(args: string[]): Promise<CommandResult> {
  const { flags, remainingArgs } = parseFlags(args);
  
  if (remainingArgs.length < 1) {
    return {
      success: false,
      message: 'Usage: market [symbol] [--exchange=bybit] [--interval=1h] [--limit=10] [--json]'
    };
  }
  
  const symbol = remainingArgs[0];
  const exchange = typeof flags.exchange === 'string' ? getExchangeFromArg(flags.exchange) : 'bybit';
  const interval = typeof flags.interval === 'string' ? flags.interval : '1h';
  const limit = typeof flags.limit === 'string' ? parseInt(flags.limit) : 10;
  const format = flags.json ? 'json' : 'table';
  
  try {
    const exchangeApi = exchangeService.getExchangeApi(exchange);
    const marketData = await exchangeApi.getMarketData(symbol, interval, limit);
    
    return {
      success: true,
      message: `Market data for ${symbol} on ${exchange}:`,
      data: formatData(marketData, format)
    };
  } catch (error) {
    return {
      success: false,
      message: `Error fetching market data: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Ticker command handler
async function handleTickerCommand(args: string[]): Promise<CommandResult> {
  const { flags, remainingArgs } = parseFlags(args);
  
  if (remainingArgs.length < 1) {
    return {
      success: false,
      message: 'Usage: ticker [symbol] [--exchange=bybit] [--json]'
    };
  }
  
  const symbol = remainingArgs[0];
  const exchange = typeof flags.exchange === 'string' ? getExchangeFromArg(flags.exchange) : 'bybit';
  const format = flags.json ? 'json' : 'table';
  
  try {
    const exchangeApi = exchangeService.getExchangeApi(exchange);
    const ticker = await exchangeApi.getTicker(symbol);
    
    return {
      success: true,
      message: `Ticker for ${symbol} on ${exchange}:`,
      data: formatData(ticker, format)
    };
  } catch (error) {
    return {
      success: false,
      message: `Error fetching ticker: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Orderbook command handler
async function handleOrderbookCommand(args: string[]): Promise<CommandResult> {
  const { flags, remainingArgs } = parseFlags(args);
  
  if (remainingArgs.length < 1) {
    return {
      success: false,
      message: 'Usage: orderbook [symbol] [--exchange=bybit] [--depth=10] [--json]'
    };
  }
  
  const symbol = remainingArgs[0];
  const exchange = typeof flags.exchange === 'string' ? getExchangeFromArg(flags.exchange) : 'bybit';
  const depth = typeof flags.depth === 'string' ? parseInt(flags.depth) : 10;
  const format = flags.json ? 'json' : 'table';
  
  try {
    const exchangeApi = exchangeService.getExchangeApi(exchange);
    const orderbook = await exchangeApi.getOrderBook(symbol, depth);
    
    // Format orderbook for better display
    const formattedOrderbook = {
      asks: orderbook.asks.slice(0, depth),
      bids: orderbook.bids.slice(0, depth),
      timestamp: orderbook.timestamp
    };
    
    return {
      success: true,
      message: `Order book for ${symbol} on ${exchange} (depth: ${depth}):`,
      data: formatData(formattedOrderbook, format)
    };
  } catch (error) {
    return {
      success: false,
      message: `Error fetching order book: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Trades command handler
async function handleTradesCommand(args: string[]): Promise<CommandResult> {
  const { flags, remainingArgs } = parseFlags(args);
  
  if (remainingArgs.length < 1) {
    return {
      success: false,
      message: 'Usage: trades [symbol] [--exchange=bybit] [--limit=10] [--json]'
    };
  }
  
  const symbol = remainingArgs[0];
  const exchange = typeof flags.exchange === 'string' ? getExchangeFromArg(flags.exchange) : 'bybit';
  const limit = typeof flags.limit === 'string' ? parseInt(flags.limit) : 10;
  const format = flags.json ? 'json' : 'table';
  
  try {
    const exchangeApi = exchangeService.getExchangeApi(exchange);
    const trades = await exchangeApi.getRecentTrades(symbol, limit);
    
    return {
      success: true,
      message: `Recent trades for ${symbol} on ${exchange}:`,
      data: formatData(trades, format)
    };
  } catch (error) {
    return {
      success: false,
      message: `Error fetching trades: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Balance command handler
async function handleBalanceCommand(args: string[]): Promise<CommandResult> {
  const { flags, remainingArgs } = parseFlags(args);
  
  const exchange = remainingArgs.length > 0 ? getExchangeFromArg(remainingArgs[0]) : 'bybit';
  const format = flags.json ? 'json' : 'table';
  
  try {
    const exchangeApi = exchangeService.getExchangeApi(exchange);
    const balance = await exchangeApi.getAccountBalance();
    
    return {
      success: true,
      message: `Account balance on ${exchange}:`,
      data: formatData(balance, format)
    };
  } catch (error) {
    return {
      success: false,
      message: `Error fetching balance: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Positions command handler
async function handlePositionsCommand(args: string[]): Promise<CommandResult> {
  const { flags, remainingArgs } = parseFlags(args);
  
  const exchange = remainingArgs.length > 0 ? getExchangeFromArg(remainingArgs[0]) : 'bybit';
  const format = flags.json ? 'json' : 'table';
  
  try {
    const exchangeApi = exchangeService.getExchangeApi(exchange);
    const positions = await exchangeApi.getPositions();
    
    return {
      success: true,
      message: `Open positions on ${exchange}:`,
      data: formatData(positions, format)
    };
  } catch (error) {
    return {
      success: false,
      message: `Error fetching positions: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Order command handler
async function handleOrderCommand(args: string[]): Promise<CommandResult> {
  const { flags, remainingArgs } = parseFlags(args);
  
  if (remainingArgs.length < 3) {
    return {
      success: false,
      message: 'Usage: order [buy|sell] [symbol] [quantity] [price (optional for market)] [--exchange=bybit] [--type=market|limit] [--tif=GTC|IOC|FOK] [--reduce-only]'
    };
  }
  
  const side = remainingArgs[0].toLowerCase() === 'buy' ? 'Buy' : 'Sell';
  const symbol = remainingArgs[1];
  const quantity = parseFloat(remainingArgs[2]);
  
  if (isNaN(quantity) || quantity <= 0) {
    return {
      success: false,
      message: 'Quantity must be a positive number'
    };
  }
  
  const price = remainingArgs.length > 3 ? parseFloat(remainingArgs[3]) : undefined;
  const exchange = typeof flags.exchange === 'string' ? getExchangeFromArg(flags.exchange) : 'bybit';
  const orderType = typeof flags.type === 'string' ? flags.type : (price ? 'Limit' : 'Market');
  const timeInForce = typeof flags.tif === 'string' ? flags.tif : 'GTC';
  const reduceOnly = flags['reduce-only'] === true;
  
  try {
    const exchangeApi = exchangeService.getExchangeApi(exchange);
    const order = await exchangeApi.placeOrder({
      symbol,
      side,
      orderType,
      quantity,
      price,
      timeInForce,
      reduceOnly
    });
    
    return {
      success: true,
      message: `Order placed successfully on ${exchange}:`,
      data: formatData(order, flags.json ? 'json' : 'table')
    };
  } catch (error) {
    return {
      success: false,
      message: `Error placing order: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Cancel order command handler
async function handleCancelCommand(args: string[]): Promise<CommandResult> {
  const { flags, remainingArgs } = parseFlags(args);
  
  if (remainingArgs.length < 1) {
    return {
      success: false,
      message: 'Usage: cancel [orderId] [--exchange=bybit] [--symbol=BTCUSDT]'
    };
  }
  
  const orderId = remainingArgs[0];
  const exchange = typeof flags.exchange === 'string' ? getExchangeFromArg(flags.exchange) : 'bybit';
  const symbol = typeof flags.symbol === 'string' ? flags.symbol : undefined;
  
  try {
    const exchangeApi = exchangeService.getExchangeApi(exchange);
    const result = await exchangeApi.cancelOrder(orderId, symbol);
    
    return {
      success: true,
      message: `Order cancelled successfully on ${exchange}:`,
      data: formatData(result, flags.json ? 'json' : 'table')
    };
  } catch (error) {
    return {
      success: false,
      message: `Error cancelling order: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// List orders command handler
async function handleOrdersCommand(args: string[]): Promise<CommandResult> {
  const { flags, remainingArgs } = parseFlags(args);
  
  const exchange = remainingArgs.length > 0 ? getExchangeFromArg(remainingArgs[0]) : 'bybit';
  const symbol = remainingArgs.length > 1 ? remainingArgs[1] : undefined;
  const format = flags.json ? 'json' : 'table';
  
  try {
    const exchangeApi = exchangeService.getExchangeApi(exchange);
    const orders = await exchangeApi.getOpenOrders(symbol);
    
    return {
      success: true,
      message: `Open orders on ${exchange}${symbol ? ` for ${symbol}` : ''}:`,
      data: formatData(orders, format)
    };
  } catch (error) {
    return {
      success: false,
      message: `Error fetching orders: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// List configured exchanges command handler
async function handleExchangesCommand(): Promise<CommandResult> {
  try {
    // Get configured exchanges with credentials
    const credentials = await exchangeCredentialsService.getCredentials();
    
    // Group by exchange
    const exchanges = credentials.reduce((acc, cred) => {
      if (!acc[cred.exchange]) {
        acc[cred.exchange] = [];
      }
      acc[cred.exchange].push({
        id: cred.id,
        api_key: `${cred.api_key.substring(0, 6)}...`,
        is_default: cred.is_default,
        is_testnet: cred.is_testnet,
        created_at: cred.created_at
      });
      return acc;
    }, {} as Record<string, any[]>);
    
    return {
      success: true,
      message: 'Configured exchanges:',
      data: formatData(exchanges, 'table')
    };
  } catch (error) {
    return {
      success: false,
      message: `Error listing exchanges: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Connect to exchange WebSocket command handler
async function handleConnectCommand(args: string[]): Promise<CommandResult> {
  const { flags, remainingArgs } = parseFlags(args);
  
  if (remainingArgs.length < 1) {
    return {
      success: false,
      message: 'Usage: connect [exchange]'
    };
  }
  
  const exchange = getExchangeFromArg(remainingArgs[0]);
  
  try {
    // Connect to exchange WebSocket
    const connected = await exchangeWebSocketService.connect(exchange);
    
    if (connected) {
      return {
        success: true,
        message: `Successfully connected to ${exchange} WebSocket`
      };
    } else {
      return {
        success: false,
        message: `Failed to connect to ${exchange} WebSocket`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error connecting to WebSocket: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Subscribe to WebSocket data command handler
async function handleSubscribeCommand(args: string[]): Promise<CommandResult> {
  const { flags, remainingArgs } = parseFlags(args);
  
  if (remainingArgs.length < 3) {
    return {
      success: false,
      message: 'Usage: subscribe [exchange] [symbol] [type] [--interval=1m]'
    };
  }
  
  const exchange = getExchangeFromArg(remainingArgs[0]);
  const symbol = remainingArgs[1];
  const type = remainingArgs[2].toUpperCase() as unknown as ExchangeDataType;
  const interval = typeof flags.interval === 'string' ? flags.interval : undefined;
  
  try {
    // Subscribe to exchange data
    await exchangeWebSocketService.subscribe(exchange, {
      symbol,
      type: ExchangeDataType[type] || ExchangeDataType.TICKER,
      interval
    });
    
    // Forward data to ElizaOS topic
    websocketService.broadcastToTopic(WebSocketTopic.EXCHANGE, {
      type: 'subscription',
      exchange,
      symbol,
      dataType: type,
      status: 'subscribed'
    });
    
    return {
      success: true,
      message: `Subscribed to ${type} data for ${symbol} on ${exchange}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error subscribing to data: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Unsubscribe from WebSocket data command handler
async function handleUnsubscribeCommand(args: string[]): Promise<CommandResult> {
  const { flags, remainingArgs } = parseFlags(args);
  
  if (remainingArgs.length < 3) {
    return {
      success: false,
      message: 'Usage: unsubscribe [exchange] [symbol] [type]'
    };
  }
  
  const exchange = getExchangeFromArg(remainingArgs[0]);
  const symbol = remainingArgs[1];
  const type = remainingArgs[2].toUpperCase() as unknown as ExchangeDataType;
  
  try {
    // Unsubscribe from exchange data
    exchangeWebSocketService.unsubscribe(exchange, {
      symbol,
      type: ExchangeDataType[type] || ExchangeDataType.TICKER
    });
    
    // Notify ElizaOS
    websocketService.broadcastToTopic(WebSocketTopic.EXCHANGE, {
      type: 'subscription',
      exchange,
      symbol,
      dataType: type,
      status: 'unsubscribed'
    });
    
    return {
      success: true,
      message: `Unsubscribed from ${type} data for ${symbol} on ${exchange}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error unsubscribing from data: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
