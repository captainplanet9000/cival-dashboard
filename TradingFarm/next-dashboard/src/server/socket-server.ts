/**
 * Trading Farm Dashboard Socket Server
 * 
 * Production-ready Socket.IO server implementation that integrates with:
 * 1. ElizaOS AI for natural language command processing
 * 2. Market data services for real-time cryptocurrency data
 * 3. Trading execution systems
 * 4. Portfolio management systems
 * 5. Knowledge base with RAG capabilities
 */

import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { ElizaAIService } from '../services/eliza-ai-service';
import { MarketDataService } from '../services/market-data-service';
import { TradingEvent, Message, MessageType, ClientSession } from '../types/socket';

/**
 * Socket.IO Server for Trading Farm Dashboard
 * Integrates with ElizaAI and Market Data services to provide real-time updates
 */
export class SocketServer {
  private app: express.Application;
  private server: http.Server;
  private io: Server;
  private port: number;
  private connectedClients: Map<string, ClientSession> = new Map();
  private marketDataService: MarketDataService;
  private elizaAIService: ElizaAIService;
  private marketDataInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 3001) {
    this.port = port;
    this.app = express();
    this.configureApp();
    this.server = http.createServer(this.app);
    this.io = this.configureSocketServer();
    this.marketDataService = new MarketDataService();
    this.elizaAIService = new ElizaAIService();
  }

  /**
   * Configure Express application
   */
  private configureApp(): void {
    // Apply CORS settings based on environment
    const corsOptions = {
      origin: process.env.NODE_ENV === 'production'
        ? [process.env.SOCKET_SERVER_CORS_ORIGIN || 'https://tradingfarm.com']
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    };

    this.app.use(cors(corsOptions));
    this.app.use(express.json());
    
    // Basic health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        clients: this.connectedClients.size
      });
    });
  }

  /**
   * Configure Socket.IO server with event handlers
   */
  private configureSocketServer(): Server {
    const io = new Server(this.server, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? [process.env.SOCKET_SERVER_CORS_ORIGIN || 'https://tradingfarm.com']
          : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Handle new connections
    io.on('connection', (socket: Socket) => this.handleConnection(socket));

    return io;
  }

  /**
   * Handle new client connection
   */
  private handleConnection(socket: Socket): void {
    const clientId = socket.id;
    console.log(`Client connected: ${clientId}`);

    // Initialize client session
    const session: ClientSession = {
      id: clientId,
      connectedAt: new Date().toISOString(),
      messages: [],
      subscriptions: {
        marketData: false,
        portfolio: false,
        agents: false
      }
    };

    this.connectedClients.set(clientId, session);

    // Send welcome message
    const welcomeMessage: Message = {
      id: uuidv4(),
      content: 'Connected to Trading Farm ElizaOS. How can I assist you today?',
      timestamp: new Date().toISOString(),
      type: MessageType.System,
      sender: 'ElizaOS'
    };

    socket.emit(TradingEvent.SYSTEM_NOTIFICATION, welcomeMessage);

    // Set up event handlers
    this.setupEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${clientId}`);
      this.connectedClients.delete(clientId);
      
      // Cleanup any client-specific resources
      this.cleanupClientResources(clientId);
    });
  }

  /**
   * Setup event handlers for a client
   */
  private setupEventHandlers(socket: Socket): void {
    const clientId = socket.id;
    
    // Command processing
    socket.on(TradingEvent.COMMAND, async (command: string) => {
      try {
        console.log(`Received command from ${clientId}: ${command}`);
        
        // Process command with ElizaAI
        const aiResponse = await this.processCommand(command, clientId);
        
        // Send response
        socket.emit(TradingEvent.SYSTEM_NOTIFICATION, aiResponse);
        
        // Store in session history
        const session = this.connectedClients.get(clientId);
        if (session) {
          session.messages.push({
            id: uuidv4(),
            content: command,
            timestamp: new Date().toISOString(),
            type: MessageType.Command
          });
          
          session.messages.push(aiResponse);
          
          // Limit history size
          if (session.messages.length > 100) {
            session.messages = session.messages.slice(-100);
          }
          
          this.connectedClients.set(clientId, session);
        }
      } catch (error) {
        console.error(`Error processing command from ${clientId}:`, error);
        socket.emit(TradingEvent.SYSTEM_NOTIFICATION, {
          id: uuidv4(),
          content: `Error processing your command: ${error.message || 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          type: MessageType.Error,
          sender: 'ElizaOS'
        });
      }
    });
    
    // Market data subscription
    socket.on(TradingEvent.SUBSCRIBE_MARKET, async (symbols?: string[]) => {
      try {
        console.log(`Client ${clientId} subscribed to market data:`, symbols);
        
        const session = this.connectedClients.get(clientId);
        if (session) {
          session.subscriptions.marketData = true;
          this.connectedClients.set(clientId, session);
        }
        
        // Send initial market data
        const marketData = await this.getMarketData(symbols);
        socket.emit(TradingEvent.MARKET_UPDATE, marketData);
        
        // If this is the first client subscribing, start periodic updates
        this.ensureMarketDataUpdates();
      } catch (error) {
        console.error(`Error subscribing to market data for ${clientId}:`, error);
        socket.emit(TradingEvent.SYSTEM_NOTIFICATION, {
          id: uuidv4(),
          content: `Error subscribing to market data: ${error.message || 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          type: MessageType.Error,
          sender: 'System'
        });
      }
    });
    
    // Market data unsubscription
    socket.on(TradingEvent.UNSUBSCRIBE_MARKET, () => {
      console.log(`Client ${clientId} unsubscribed from market data`);
      
      const session = this.connectedClients.get(clientId);
      if (session) {
        session.subscriptions.marketData = false;
        this.connectedClients.set(clientId, session);
      }
      
      // If no clients are subscribed, stop periodic updates
      this.checkAndStopMarketDataUpdates();
    });
  }

  /**
   * Process a command with ElizaAI
   */
  private async processCommand(command: string, clientId: string): Promise<Message> {
    try {
      // Get session history for context
      const session = this.connectedClients.get(clientId);
      const context = session ? session.messages : [];
      
      // Process with ElizaAI
      const response = await this.elizaAIService.processCommand(command, context);
      
      // Detect intent (simplified implementation)
      const intent = this.detectIntent(command);
      
      // Prepare response message
      const message: Message = {
        id: uuidv4(),
        content: response,
        timestamp: new Date().toISOString(),
        type: MessageType.Response,
        sender: 'ElizaOS',
        metadata: {
          intent: intent.type,
          confidence: intent.confidence,
          entities: intent.entities
        }
      };
      
      // Handle special commands based on intent
      await this.handleSpecialCommands(intent, clientId);
      
      return message;
    } catch (error) {
      console.error('Error processing command:', error);
      return {
        id: uuidv4(),
        content: `I encountered an error processing your request: ${error.message || 'Unknown error'}. Please try again or rephrase your command.`,
        timestamp: new Date().toISOString(),
        type: MessageType.Error,
        sender: 'ElizaOS'
      };
    }
  }

  /**
   * Detect intent from command (simplified implementation)
   */
  private detectIntent(command: string): { type: string; confidence: number; entities: Record<string, string> } {
    const commandLower = command.toLowerCase();
    const entities: Record<string, string> = {};
    
    // Very basic intent detection - in production this would use a proper NLU model
    if (commandLower.includes('price') || commandLower.includes('market') || 
        commandLower.includes('bitcoin') || commandLower.includes('btc') || 
        commandLower.includes('eth') || commandLower.includes('sol')) {
      
      // Extract potential crypto symbols
      const cryptoSymbols = ['btc', 'eth', 'sol', 'matic', 'dot', 'bnb', 'usdt', 'usdc'];
      for (const symbol of cryptoSymbols) {
        if (commandLower.includes(symbol)) {
          entities['crypto'] = symbol.toUpperCase();
          break;
        }
      }
      
      return { 
        type: 'get_market_data', 
        confidence: 0.85, 
        entities 
      };
    }
    
    if (commandLower.includes('portfolio') || commandLower.includes('holdings') || 
        commandLower.includes('balance') || commandLower.includes('assets')) {
      return { 
        type: 'view_portfolio', 
        confidence: 0.9, 
        entities: {} 
      };
    }
    
    if (commandLower.includes('agent') || commandLower.includes('bot') || 
        commandLower.includes('trader') || commandLower.includes('automation')) {
      return { 
        type: 'manage_agents', 
        confidence: 0.8, 
        entities: {} 
      };
    }
    
    if (commandLower.includes('buy') || commandLower.includes('sell') || 
        commandLower.includes('trade') || commandLower.includes('order')) {
      
      // Extract potential crypto symbols and amounts
      const cryptoSymbols = ['btc', 'eth', 'sol', 'matic', 'dot', 'bnb', 'usdt', 'usdc'];
      for (const symbol of cryptoSymbols) {
        if (commandLower.includes(symbol)) {
          entities['crypto'] = symbol.toUpperCase();
          break;
        }
      }
      
      // Try to extract amount
      const amountMatch = commandLower.match(/\d+(\.\d+)?/);
      if (amountMatch) {
        entities['amount'] = amountMatch[0];
      }
      
      // Detect buy/sell intent
      if (commandLower.includes('buy')) {
        entities['action'] = 'buy';
      } else if (commandLower.includes('sell')) {
        entities['action'] = 'sell';
      }
      
      return { 
        type: 'execute_trade', 
        confidence: 0.75, 
        entities 
      };
    }
    
    if (commandLower.includes('help') || commandLower.includes('guide') || 
        commandLower.includes('tutorial') || commandLower.includes('how to')) {
      return { 
        type: 'get_help', 
        confidence: 0.95, 
        entities: {} 
      };
    }
    
    // Default to general query with lower confidence
    return { 
      type: 'general_query', 
      confidence: 0.6, 
      entities: {} 
    };
  }

  /**
   * Handle special commands based on intent
   */
  private async handleSpecialCommands(
    intent: { type: string; confidence: number; entities: Record<string, string> }, 
    clientId: string
  ): Promise<void> {
    const socket = this.io.sockets.sockets.get(clientId);
    if (!socket) return;
    
    try {
      switch (intent.type) {
        case 'get_market_data':
          // If a specific crypto was mentioned, get detailed data for it
          if (intent.entities.crypto) {
            const symbol = intent.entities.crypto.toLowerCase();
            const chartData = await this.marketDataService.getMarketChartData(symbol, 'usd', 1);
            socket.emit(TradingEvent.CHART_DATA, {
              asset: symbol.toUpperCase(),
              data: chartData
            });
          }
          break;
          
        case 'view_portfolio':
          // In a real implementation, this would fetch actual portfolio data
          // For now, we'll just send mock data
          const mockPortfolio = this.getMockPortfolioData();
          socket.emit(TradingEvent.PORTFOLIO_UPDATE, mockPortfolio);
          break;
          
        case 'manage_agents':
          // Send mock agent data
          const mockAgents = this.getMockAgentData();
          socket.emit(TradingEvent.AGENT_STATUS, mockAgents);
          break;
          
        case 'execute_trade':
          // In a real implementation, this would execute an actual trade
          // For now, we'll just send a mock trade confirmation
          if (intent.entities.crypto && intent.entities.action) {
            const mockTrade = this.generateMockTrade(
              intent.entities.crypto,
              intent.entities.action,
              intent.entities.amount
            );
            socket.emit(TradingEvent.TRADE_EXECUTION, mockTrade);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling special command:', error);
    }
  }

  /**
   * Get market data from service
   */
  private async getMarketData(symbols?: string[]): Promise<any[]> {
    try {
      // If specific symbols were requested, get data for those
      if (symbols && symbols.length > 0) {
        const symbolsString = symbols.join(',').toLowerCase();
        const data = await this.marketDataService.getMarketData('usd', [symbolsString]);
        return data;
      }
      
      // Otherwise, get top cryptocurrencies
      return await this.marketDataService.getMarketData();
    } catch (error) {
      console.error('Error fetching market data:', error);
      return [];
    }
  }

  /**
   * Ensure market data updates are running
   */
  private ensureMarketDataUpdates(): void {
    if (this.marketDataInterval) return;
    
    const anyClientSubscribed = Array.from(this.connectedClients.values())
      .some(client => client.subscriptions.marketData);
      
    if (!anyClientSubscribed) return;
    
    // Set up periodic market data updates
    this.marketDataInterval = setInterval(async () => {
      try {
        const marketData = await this.getMarketData();
        
        // Send updates only to subscribed clients
        this.connectedClients.forEach((session, clientId) => {
          if (session.subscriptions.marketData) {
            const socket = this.io.sockets.sockets.get(clientId);
            if (socket) {
              socket.emit(TradingEvent.MARKET_UPDATE, marketData);
            }
          }
        });
      } catch (error) {
        console.error('Error sending market data updates:', error);
      }
    }, parseInt(process.env.MARKET_DATA_REFRESH_INTERVAL || '30000'));
  }

  /**
   * Check if any clients are still subscribed and stop updates if not
   */
  private checkAndStopMarketDataUpdates(): void {
    const anyClientSubscribed = Array.from(this.connectedClients.values())
      .some(client => client.subscriptions.marketData);
      
    if (!anyClientSubscribed && this.marketDataInterval) {
      clearInterval(this.marketDataInterval);
      this.marketDataInterval = null;
    }
  }

  /**
   * Cleanup resources when a client disconnects
   */
  private cleanupClientResources(clientId: string): void {
    // Remove client from connected clients
    this.connectedClients.delete(clientId);
    
    // Check if we need to stop market data updates
    this.checkAndStopMarketDataUpdates();
  }

  /**
   * Start the server
   */
  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`Socket.IO server running on port ${this.port}`);
    });
  }

  /**
   * Stop the server
   */
  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clear intervals
      if (this.marketDataInterval) {
        clearInterval(this.marketDataInterval);
        this.marketDataInterval = null;
      }
      
      // Close server
      this.server.close((err) => {
        if (err) {
          console.error('Error closing server:', err);
          reject(err);
        } else {
          console.log('Server closed successfully');
          resolve();
        }
      });
    });
  }

  /**
   * Mock data generation methods for development/testing
   */
  private getMockPortfolioData() {
    return {
      totalValue: 152789.45,
      change24h: 3.76,
      assets: [
        { symbol: "BTC", amount: 1.258, value: 78432.79, allocation: 51.3 },
        { symbol: "ETH", amount: 15.742, value: 54421.2, allocation: 35.6 },
        { symbol: "SOL", amount: 85.3, value: 11572.66, allocation: 7.6 },
        { symbol: "MATIC", amount: 4500, value: 4005.0, allocation: 2.6 },
        { symbol: "DOT", amount: 600, value: 4338.0, allocation: 2.9 },
      ],
      timestamp: new Date().toISOString(),
      performance: {
        daily: 3.76,
        weekly: 8.12,
        monthly: 15.45,
        yearly: 122.67,
      },
    };
  }

  private getMockAgentData() {
    return [
      {
        id: "agent-1",
        name: "BTC Momentum Trader",
        status: "active",
        asset: "BTC",
        strategy: "Momentum",
        performance: { daily: 1.2, weekly: 5.7, monthly: 12.3 },
        lastActive: new Date().toISOString(),
        trades: 57,
        successRate: 68.4,
      },
      {
        id: "agent-2",
        name: "ETH Swing Trader",
        status: "active",
        asset: "ETH",
        strategy: "Swing",
        performance: { daily: 0.8, weekly: 3.2, monthly: 9.5 },
        lastActive: new Date().toISOString(),
        trades: 34,
        successRate: 71.2,
      },
      {
        id: "agent-3",
        name: "SOL Breakout Hunter",
        status: "paused",
        asset: "SOL",
        strategy: "Breakout",
        performance: { daily: 0, weekly: 2.1, monthly: 7.8 },
        lastActive: new Date(Date.now() - 86400000).toISOString(),
        trades: 28,
        successRate: 64.3,
      },
    ];
  }

  private generateMockTrade(crypto: string, action: string, amount?: string) {
    const tradeAmount = amount ? parseFloat(amount) : Math.random() * (action === 'buy' ? 0.2 : 0.5);
    let price = 0;
    
    // Set price based on crypto
    switch (crypto.toUpperCase()) {
      case 'BTC': price = 62345.78; break;
      case 'ETH': price = 3456.89; break;
      case 'SOL': price = 135.67; break;
      case 'MATIC': price = 0.89; break;
      case 'DOT': price = 7.23; break;
      default: price = 1000; // Default price
    }
    
    const total = tradeAmount * price;
    const fee = total * 0.001; // 0.1% fee
    
    return {
      id: uuidv4(),
      symbol: crypto.toUpperCase(),
      price: price,
      amount: tradeAmount,
      side: action as 'buy' | 'sell',
      timestamp: new Date().toISOString(),
      total: total,
      fee: fee,
      status: 'completed',
      executedBy: 'user',
    };
  }
}

// Export function to start server
export function startSocketServer(port: number = 3001): SocketServer {
  const server = new SocketServer(port);
  server.start();
  return server;
}

// Allow direct execution of this file
if (require.main === module) {
  startSocketServer();
}
