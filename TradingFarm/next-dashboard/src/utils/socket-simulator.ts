/**
 * Socket.IO Simulator for ElizaOS Command Center Testing
 * 
 * This utility provides a mock implementation of Socket.IO server events
 * to allow for frontend development without requiring the full backend.
 */

import { Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import {
  MessageType,
  Message,
  MarketData,
  PortfolioUpdate,
  AgentStatus,
  ChartDataResponse,
  TradeExecution,
  OrderBook,
  KnowledgeResult,
  MarketChartData
} from "@/types/socket";
import { TRADING_EVENTS } from "@/constants/socket-events";
import { Strategy, StrategyStatusUpdate, StrategyPerformanceUpdate } from "@/types/strategy";

// Mock data for market updates
const mockCoins = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", current_price: 62345.78 },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", current_price: 3456.89 },
  { id: "solana", symbol: "SOL", name: "Solana", current_price: 135.67 },
  { id: "polygon", symbol: "MATIC", name: "Polygon", current_price: 0.89 },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", current_price: 7.23 },
];

// Helper to get asset price from mockCoins
function getCoinPrice(symbol: string): number {
  const symbolUpper = symbol.toUpperCase();
  const coin = mockCoins.find(c => c.symbol.toUpperCase() === symbolUpper);
  return coin ? coin.current_price : 50000; // Default to 50000 if not found
}

// Mock portfolio data
const mockPortfolio: PortfolioUpdate = {
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

// Mock agent statuses
const mockAgents: AgentStatus[] = [
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

// Mock knowledge base snippets
const mockKnowledgeBase = [
  {
    id: "kb-1",
    topic: "bitcoin",
    content: "Bitcoin is a decentralized digital currency created in 2009 by an unknown person or group using the pseudonym Satoshi Nakamoto. It operates on a peer-to-peer network without central authority, using blockchain technology to record all transactions. Bitcoin has a limited supply of 21 million coins, making it potentially deflationary. It's known for its volatility and has been both criticized as a speculative bubble and praised as a revolutionary financial technology.",
    source: "Trading Farm Knowledge Base"
  },
  {
    id: "kb-2",
    topic: "ethereum",
    content: "Ethereum is a decentralized, open-source blockchain platform featuring smart contract functionality. Created by Vitalik Buterin in 2015, it enables developers to build and deploy decentralized applications (dApps). Ethereum's native cryptocurrency is Ether (ETH), which is used to pay for transaction fees and computational services. Unlike Bitcoin, Ethereum's primary purpose extends beyond digital currency to serve as a platform for executing programmable smart contracts and applications without downtime, fraud, or third-party interference.",
    source: "Crypto Encyclopedia"
  },
  {
    id: "kb-3",
    topic: "trading strategy",
    content: "Trading strategies in cryptocurrency markets include momentum trading (following price trends), swing trading (capturing 'swings' in price movements), breakout trading (entering when price breaks support/resistance), grid trading (placing buy/sell orders at set intervals), and dollar-cost averaging (regular purchases regardless of price). Effective strategies typically incorporate technical analysis, fundamental analysis, risk management rules, position sizing guidelines, and entry/exit criteria based on specific indicators or market conditions.",
    source: "Trading Fundamentals Guide"
  },
  {
    id: "kb-4",
    topic: "risk management",
    content: "Risk management in cryptocurrency trading involves setting stop-loss orders (to limit potential losses), position sizing (adjusting trade size based on risk tolerance), diversification (distributing investments across multiple assets), and maintaining a risk-reward ratio (ensuring potential gains outweigh potential losses). Given crypto market volatility, experts recommend risking no more than 1-2% of capital per trade, maintaining a trading journal to monitor performance, and regularly reviewing and adjusting strategies based on changing market conditions.",
    source: "Risk Management Handbook"
  },
  {
    id: "kb-5",
    topic: "technical analysis",
    content: "Technical analysis in cryptocurrency trading involves studying price charts and using indicators to forecast future price movements. Common indicators include Moving Averages (identifying trends), Relative Strength Index (RSI, measuring momentum), MACD (Moving Average Convergence Divergence, spotting momentum shifts), Bollinger Bands (measuring volatility), and Fibonacci retracement levels (identifying potential support/resistance). Chart patterns like head and shoulders, double tops/bottoms, and triangles also help traders make decisions. Technical analysis works on the premise that historical price action can indicate future movements.",
    source: "Technical Analysis Principles"
  },
];

// Mock strategies data
const mockStrategies: Strategy[] = [
  {
    id: 'strat-001',
    name: 'Momentum Rider',
    description: 'Follows market momentum with adaptive entry and exit points',
    status: 'active',
    type: 'trend',
    timeframe: '4h',
    performance: '+8.3%',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    marketIds: ['BTC-USD', 'ETH-USD'],
    indicators: ['RSI', 'MACD', 'EMA'],
    riskLevel: 'medium',
    author: 'TradingFarm AI',
    tags: ['momentum', 'trend', 'adaptive'],
    profitTarget: 5.0,
    stopLoss: 2.0,
    activeTrades: 2,
    totalTrades: 45,
    winRate: 0.67
  },
  {
    id: 'strat-002',
    name: 'Volatility Breakout',
    description: 'Captures price breakouts during high volatility periods',
    status: 'paused',
    type: 'breakout',
    timeframe: '1h',
    performance: '+4.2%',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    marketIds: ['BTC-USD', 'SOL-USD'],
    indicators: ['Bollinger Bands', 'ATR', 'Volume'],
    riskLevel: 'high',
    author: 'TradingFarm AI',
    tags: ['breakout', 'volatility', 'momentum'],
    profitTarget: 7.5,
    stopLoss: 3.5,
    activeTrades: 0,
    totalTrades: 27,
    winRate: 0.59
  },
  {
    id: 'strat-003',
    name: 'Mean Reversion VWAP',
    description: 'Trades reversions to VWAP with oversold/overbought filters',
    status: 'active',
    type: 'mean-reversion',
    timeframe: '15m',
    performance: '+5.7%',
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    marketIds: ['ETH-USD', 'BNB-USD'],
    indicators: ['VWAP', 'RSI', 'Stochastic'],
    riskLevel: 'medium',
    author: 'TradingFarm AI',
    tags: ['mean-reversion', 'vwap', 'oscillators'],
    profitTarget: 3.5,
    stopLoss: 1.5,
    activeTrades: 3,
    totalTrades: 86,
    winRate: 0.72
  },
  {
    id: 'strat-004',
    name: 'Bollinger Band Scalper',
    description: 'Scalps price movements between Bollinger Bands',
    status: 'inactive',
    type: 'scalping',
    timeframe: '5m',
    performance: '-1.2%',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    marketIds: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
    indicators: ['Bollinger Bands', 'RSI', 'MACD'],
    riskLevel: 'high',
    author: 'TradingFarm AI',
    tags: ['scalping', 'bollinger', 'short-term'],
    profitTarget: 1.0,
    stopLoss: 0.5,
    activeTrades: 0,
    totalTrades: 134,
    winRate: 0.58
  }
];

/**
 * Simulate Socket.IO events for frontend development
 */
export function initializeSocketSimulator(socket: Socket): void {
  if (!socket) return;

  console.log("Initializing Socket.IO simulator for development");

  // Function to emit mock data from server to client - SINGLE IMPLEMENTATION
  const emitFromServer = (event: string, data: any) => {
    console.log(`[SOCKET SIMULATOR] Emitting event: ${event}`);
    // We use addListener rather than directly emit to avoid confusion
    // This mimics what would typically happen on the server
    if (socket.hasListeners(event)) {
      socket.emit(event, data);
    } else {
      // Add a one-time listener for this event, then trigger it
      socket.once(event, () => {
        console.log(`Socket simulator: Client registered handler for '${event}'`);
      });
      
      // Call the handler directly
      socket.emit(event, data);
    }
  };
  
  // Setup server-side event listeners (mocked)
  const setupServerListeners = () => {
    // Listen for client-emitted events
    socket.on(TRADING_EVENTS.ELIZA_COMMAND, (command: string) => {
      const { intent, confidence, response } = processMessageIntent(command);
      const message: Message = {
        id: uuidv4(),
        content: response,
        timestamp: new Date().toISOString(),
        type: MessageType.Response,
        sender: "ElizaOS",
        metadata: {
          intent: intent,
          confidence: confidence,
        }
      };
      emitFromServer(TRADING_EVENTS.COMMAND_RESPONSE, message);
    });
    
    socket.on(TRADING_EVENTS.MARKET_DATA_UPDATE, (symbols: string[]) => {
      const symbolList = Array.isArray(symbols) ? symbols : ['BTC', 'ETH', 'SOL'];
      console.log(`Subscribing to market data for: ${symbolList.join(', ')}`);
      
      // Send initial market data
      sendMarketUpdate();
      
      // Start periodic market updates
      startMarketUpdates();
    });

    // Strategy events
    socket.on(TRADING_EVENTS.GET_STRATEGIES, (data: any, callback: (data: Strategy[]) => void) => {
      console.log("Received request for strategies in socket simulator");
      
      // First emit the strategies to all listeners
      emitFromServer(TRADING_EVENTS.GET_STRATEGIES, mockStrategies);
      
      // Then call the callback if provided
      if (typeof callback === 'function') {
        console.log("Calling callback with mock strategies");
        try {
          callback(mockStrategies);
        } catch (error) {
          console.error("Error in GET_STRATEGIES callback:", error);
        }
      } else {
        console.log("No callback provided for GET_STRATEGIES event");
      }
    });
    
    socket.on(TRADING_EVENTS.CREATE_STRATEGY, (strategyData: Partial<Strategy>, callback: (data: Strategy) => void) => {
      console.log("Received request to create strategy", strategyData);
      const newStrategy: Strategy = {
        ...strategyData as any,
        id: `strat-${uuidv4().substring(0, 8)}`,
        status: 'inactive',
        performance: '0.0%',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activeTrades: 0,
        totalTrades: 0,
        winRate: 0
      };
      
      // Add to mock strategies
      mockStrategies.push(newStrategy);
      
      // Emit event to all clients
      setTimeout(() => {
        emitFromServer(TRADING_EVENTS.STRATEGY_CREATED, newStrategy);
      }, 500);
      
      if (typeof callback === 'function') {
        callback(newStrategy);
      }
    });
    
    socket.on(TRADING_EVENTS.UPDATE_STRATEGY, (data: { id: string, [key: string]: any }, callback: (data: Strategy | { error: string }) => void) => {
      const { id, ...updates } = data;
      console.log(`Received request to update strategy ${id}`, updates);
      
      const strategyIndex = mockStrategies.findIndex(s => s.id === id);
      if (strategyIndex === -1) {
        if (typeof callback === 'function') {
          callback({ error: 'Strategy not found' });
        }
        return;
      }
      
      // Update strategy
      const updatedStrategy = {
        ...mockStrategies[strategyIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      mockStrategies[strategyIndex] = updatedStrategy;
      
      // Emit event to all clients
      setTimeout(() => {
        emitFromServer(TRADING_EVENTS.STRATEGY_UPDATED, updatedStrategy);
      }, 500);
      
      if (typeof callback === 'function') {
        callback(updatedStrategy);
      }
    });
    
    socket.on(TRADING_EVENTS.DELETE_STRATEGY, (data: { id: string }, callback: (success: boolean) => void) => {
      const { id } = data;
      console.log(`Received request to delete strategy ${id}`);
      
      const strategyIndex = mockStrategies.findIndex(s => s.id === id);
      if (strategyIndex === -1) {
        if (typeof callback === 'function') {
          callback(false);
        }
        return;
      }
      
      // Remove from mock strategies
      mockStrategies.splice(strategyIndex, 1);
      
      // Emit event to all clients
      setTimeout(() => {
        emitFromServer(TRADING_EVENTS.STRATEGY_DELETED, { id });
      }, 500);
      
      if (typeof callback === 'function') {
        callback(true);
      }
    });
    
    socket.on(TRADING_EVENTS.CHANGE_STRATEGY_STATUS, (data: { id: string, status: 'active' | 'paused' | 'inactive' }, callback: (data: Strategy | { error: string }) => void) => {
      const { id, status } = data;
      console.log(`Received request to change strategy ${id} status to ${status}`);
      
      const strategyIndex = mockStrategies.findIndex(s => s.id === id);
      if (strategyIndex === -1) {
        if (typeof callback === 'function') {
          callback({ error: 'Strategy not found' });
        }
        return;
      }
      
      // Update strategy status
      mockStrategies[strategyIndex].status = status;
      mockStrategies[strategyIndex].updatedAt = new Date().toISOString();
      
      const statusUpdate: StrategyStatusUpdate = {
        id,
        status,
        updatedAt: new Date().toISOString()
      };
      
      // Emit event to all clients
      setTimeout(() => {
        emitFromServer(TRADING_EVENTS.STRATEGY_STATUS_CHANGED, statusUpdate);
      }, 500);
      
      if (typeof callback === 'function') {
        callback(mockStrategies[strategyIndex]);
      }
    });
    
    socket.on(TRADING_EVENTS.GET_STRATEGY_PERFORMANCE, (data: { id: string }, callback: (data: any) => void) => {
      const { id } = data;
      console.log(`Received request for strategy ${id} performance data`);
      
      const strategy = mockStrategies.find(s => s.id === id);
      if (!strategy) {
        if (typeof callback === 'function') {
          callback({ error: 'Strategy not found' });
        }
        return;
      }
      
      // Generate mock performance data
      const performanceData = {
        id: strategy.id,
        returns: {
          daily: parseFloat((Math.random() * 2 - 0.5).toFixed(2)),
          weekly: parseFloat((Math.random() * 5 - 1).toFixed(2)),
          monthly: parseFloat((Math.random() * 10 - 2).toFixed(2)),
          allTime: parseFloat((Math.random() * 20 - 5).toFixed(2))
        },
        trades: {
          total: strategy.totalTrades || 0,
          winning: Math.floor((strategy.totalTrades || 0) * (strategy.winRate || 0)),
          losing: (strategy.totalTrades || 0) - Math.floor((strategy.totalTrades || 0) * (strategy.winRate || 0)),
          open: strategy.activeTrades || 0
        },
        metrics: {
          sharpeRatio: parseFloat((Math.random() * 3).toFixed(2)),
          maxDrawdown: parseFloat((Math.random() * 15).toFixed(2)),
          winRate: strategy.winRate || 0,
          averageReturn: parseFloat((Math.random() * 2 - 0.5).toFixed(2)),
          profitFactor: parseFloat((Math.random() * 2 + 0.8).toFixed(2))
        },
        history: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
          value: 100 + parseFloat((Math.random() * 40 - 10).toFixed(2))
        }))
      };
      
      if (typeof callback === 'function') {
        callback(performanceData);
      }
    });
  };

  // Set up the event listeners
  setupServerListeners();

  // Regular expression helper function for command processing
  function matchCommand(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.match(new RegExp(`\\b${pattern}\\b`, 'i')));
  }

  // Process client commands
  function processMessageIntent(message: string): { intent: string, confidence: number, response: string } {
    console.log(`[SOCKET SIMULATOR] Processing command intent: ${message}`);
    
    // Default values
    let intent = "general.query";
    let confidence = 0.6;
    let response = `I processed your command: "${message}". For specific information, try asking about price, portfolio, strategies, or agents.`;
    
    const msg = message.toLowerCase();
    
    // Check for market/price related commands
    if (matchCommand(msg, ['price', 'market', 'btc', 'eth', 'bitcoin', 'ethereum'])) {
      intent = "market.price";
      confidence = 0.85;
      
      // Check for specific asset
      let asset = "BTC";
      if (msg.includes('eth') || msg.includes('ethereum')) asset = "ETH";
      else if (msg.includes('sol') || msg.includes('solana')) asset = "SOL";
      else if (msg.includes('matic') || msg.includes('polygon')) asset = "MATIC";
      else if (msg.includes('dot') || msg.includes('polkadot')) asset = "DOT";
      
      const price = getCoinPrice(asset);
      response = `Current ${asset} price: $${price.toLocaleString()}`;
      
      // Send a market update event
      emitFromServer(TRADING_EVENTS.MARKET_UPDATE, {
        symbol: asset,
        price: price,
        change: (Math.random() * 5 - 2.5).toFixed(2),
        volume: price * 10000 * (Math.random() + 0.5),
        timestamp: new Date().toISOString()
      });
    } 
    // Check for portfolio-related commands
    else if (matchCommand(msg, ['portfolio', 'balance', 'holdings', 'assets'])) {
      intent = "portfolio.summary";
      confidence = 0.9;
      response = `Your portfolio value is $${mockPortfolio.totalValue.toLocaleString()} (${mockPortfolio.change24h > 0 ? '+' : ''}${mockPortfolio.change24h}% today)`;
      
      // Send a portfolio update event
      emitFromServer(TRADING_EVENTS.PORTFOLIO_UPDATE, mockPortfolio);
    }
    // Check for strategy-related commands
    else if (matchCommand(msg, ['strateg', 'trading plan', 'algorithm'])) {
      intent = "strategy.list";
      confidence = 0.82;
      
      // Count active strategies
      const activeStrategies = mockStrategies.filter(s => s.status === 'active');
      
      response = `You have ${mockStrategies.length} strategies (${activeStrategies.length} active)`;
      
      // Send strategies update event
      emitFromServer(TRADING_EVENTS.GET_STRATEGIES, mockStrategies);
    }
    // Check for agent-related commands
    else if (matchCommand(msg, ['agent', 'bot', 'trader'])) {
      intent = "agent.status";
      confidence = 0.84;
      
      // Count active agents
      const activeAgents = mockAgents.filter(a => a.status === 'active');
      
      response = `You have ${mockAgents.length} trading agents (${activeAgents.length} active)`;
      
      // Send agent update event
      emitFromServer(TRADING_EVENTS.AGENT_STATUS, mockAgents);
    }
    // Check for trading commands
    else if (matchCommand(msg, ['buy', 'sell', 'trade', 'execute'])) {
      intent = "trade.execute";
      confidence = 0.78;
      
      // Check for trade direction
      const isBuy = !msg.includes('sell');
      
      // Check for asset
      let asset = "BTC";
      if (msg.includes('eth')) asset = "ETH";
      else if (msg.includes('sol')) asset = "SOL";
      else if (msg.includes('matic')) asset = "MATIC";
      else if (msg.includes('dot')) asset = "DOT";
      
      // Try to extract amount
      const amountMatch = msg.match(/\b(\d+(\.\d+)?)\b/);
      const amount = amountMatch ? parseFloat(amountMatch[0]) : 0.1;
      
      response = `I've initiated a ${isBuy ? 'buy' : 'sell'} order for ${amount} ${asset}. The current market price is approximately $${getCoinPrice(asset).toLocaleString()}.`;
      
      // Simulate a trade execution
      setTimeout(() => {
        const trade: TradeExecution = {
          id: uuidv4(),
          symbol: asset,
          price: getCoinPrice(asset),
          amount: amount,
          side: isBuy ? 'buy' : 'sell',
          timestamp: new Date().toISOString(),
          total: amount * getCoinPrice(asset),
          fee: amount * getCoinPrice(asset) * 0.001,
          status: 'completed',
          executedBy: Math.random() > 0.7 ? 'agent' : 'user',
          agentId: Math.random() > 0.7 ? mockAgents[0].id : undefined
        };
        
        emitFromServer(TRADING_EVENTS.TRADE_EXECUTED, trade);
      }, 1500);
    }
    // Check for help command
    else if (matchCommand(msg, ['help', 'command', 'assist', 'guide'])) {
      intent = "system.help";
      confidence = 0.95;
      response = `Available commands:
- Market: Check prices (Example: "BTC price")
- Portfolio: View your portfolio (Example: "Show my portfolio")
- Strategies: Manage trading strategies (Example: "List my strategies")
- Agents: Manage trading bots (Example: "Show active agents")
- Trading: Execute trades (Example: "Buy 0.1 BTC")`;
    }
    // Check for chart request
    else if (matchCommand(msg, ['chart', 'graph', 'plot', 'history'])) {
      intent = "market.chart";
      confidence = 0.86;
      
      // Check for asset
      let asset = "BTC";
      if (msg.includes('eth')) asset = "ETH";
      else if (msg.includes('sol')) asset = "SOL";
      else if (msg.includes('matic')) asset = "MATIC";
      else if (msg.includes('dot')) asset = "DOT";
      
      // Try to extract time period
      let days = 7;
      if (msg.includes('year') || msg.includes('365')) days = 365;
      else if (msg.includes('month') || msg.includes('30')) days = 30;
      else if (msg.includes('week') || msg.includes('7')) days = 7;
      else if (msg.includes('day') || msg.includes('24h')) days = 1;
      
      response = `Generating ${asset} price chart for the last ${days} day${days !== 1 ? 's' : ''}`;
      
      // Generate and emit chart data
      const chartData = generateMockChartData(asset, days);
      emitFromServer(TRADING_EVENTS.MARKET_CHART, chartData);
    }
    
    return { intent, confidence, response };
  }

  // Simulate periodic market updates
  function startMarketUpdates() {
    // Initial update
    sendMarketUpdate();
    
    // Schedule periodic updates
    const intervalId = setInterval(() => {
      sendMarketUpdate();
    }, 15000); // Update every 15 seconds
    
    // Clean up interval when socket disconnects
    socket.on("disconnect", () => {
      clearInterval(intervalId);
    });
  }

  // Send a market update event
  function sendMarketUpdate() {
    const marketData = mockCoins.map(coin => {
      // Generate random price variations
      const priceChange = (Math.random() - 0.45) * (coin.current_price * 0.02);
      const newPrice = coin.current_price + priceChange;
      
      // Create a full MarketData object
      return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: `https://assets.coingecko.com/coins/images/1/small/${coin.id}.png`,
        current_price: newPrice,
        market_cap: newPrice * (coin.id === "bitcoin" ? 19400000 : 120000000),
        market_cap_rank: mockCoins.findIndex(c => c.id === coin.id) + 1,
        fully_diluted_valuation: newPrice * (coin.id === "bitcoin" ? 21000000 : 150000000),
        total_volume: newPrice * (Math.random() * 500000 + 100000),
        high_24h: newPrice * (1 + (Math.random() * 0.05)),
        low_24h: newPrice * (1 - (Math.random() * 0.05)),
        price_change_24h: priceChange * 5,
        price_change_percentage_24h: (priceChange / coin.current_price) * 100 * 5,
        market_cap_change_24h: priceChange * (coin.id === "bitcoin" ? 19400000 : 120000000) * 0.8,
        market_cap_change_percentage_24h: (priceChange / coin.current_price) * 100 * 4,
        circulating_supply: coin.id === "bitcoin" ? 19400000 : 120000000,
        total_supply: coin.id === "bitcoin" ? 21000000 : (coin.id === "ethereum" ? null : 150000000),
        max_supply: coin.id === "bitcoin" ? 21000000 : (coin.id === "ethereum" ? null : 150000000),
        ath: coin.current_price * 1.5,
        ath_change_percentage: -33.3,
        ath_date: "2021-11-10T14:24:11.849Z",
        atl: coin.current_price * 0.01,
        atl_change_percentage: 9900,
        atl_date: "2013-07-05T14:24:11.849Z",
        last_updated: new Date().toISOString(),
        price_change_percentage_1h_in_currency: (Math.random() - 0.45) * 2,
        price_change_percentage_24h_in_currency: (priceChange / coin.current_price) * 100 * 5,
        price_change_percentage_7d_in_currency: (Math.random() - 0.45) * 15,
      } as MarketData;
    });
    
    // Send market update event
    emitFromServer(TRADING_EVENTS.MARKET_UPDATE, marketData);
    
    // Occasionally simulate a trade execution
    if (Math.random() > 0.7) {
      const randomCoin = mockCoins[Math.floor(Math.random() * mockCoins.length)];
      const isBuy = Math.random() > 0.5;
      const amount = parseFloat((Math.random() * (isBuy ? 0.2 : 0.5)).toFixed(4));
      const price = randomCoin.current_price;
      const total = amount * price;
      const fee = total * 0.001;
      
      const trade: TradeExecution = {
        id: uuidv4(),
        symbol: randomCoin.symbol,
        price: price,
        amount: amount,
        side: isBuy ? 'buy' : 'sell',
        timestamp: new Date().toISOString(),
        total: total,
        fee: fee,
        status: 'completed',
        executedBy: Math.random() > 0.7 ? 'agent' : 'user',
        agentId: Math.random() > 0.7 ? mockAgents[0].id : undefined
      };
      
      // Send trade execution event
      emitFromServer(TRADING_EVENTS.TRADE_EXECUTED, trade);
    }
  }

  // Generate mock chart data
  function generateMockChartData(asset: string, days: number = 7): ChartDataResponse {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const dataPoints = days * 24; // Hourly data
    
    const basePrice = getCoinPrice(asset);
    const volatility = 0.05; // 5% volatility
    
    const prices: [number, number][] = [];
    const marketCaps: [number, number][] = [];
    const volumes: [number, number][] = [];
    
    let price = basePrice;
    let marketCap = basePrice * 19000000; // Approximate for BTC
    let volume = basePrice * 100000;
    
    for (let i = 0; i < dataPoints; i++) {
      const timestamp = now - (dataPoints - i) * (oneDayMs / 24);
      
      // Random walk price
      const change = price * (Math.random() * volatility * 2 - volatility);
      price += change;
      
      // Corresponding market cap
      marketCap = price * (asset === 'BTC' ? 19400000 : 120000000);
      
      // Volume with some random spikes
      const volumeMultiplier = Math.random() > 0.9 ? 3 : 1;
      volume = price * 100000 * (0.8 + Math.random() * 0.4) * volumeMultiplier;
      
      prices.push([timestamp, price]);
      marketCaps.push([timestamp, marketCap]);
      volumes.push([timestamp, volume]);
    }
    
    const chartData: MarketChartData = {
      prices,
      market_caps: marketCaps,
      total_volumes: volumes
    };
    
    return {
      asset,
      data: chartData
    };
  }

  // Simulate strategy status updates
  function simulateStrategyStatusUpdate(): StrategyStatusUpdate {
    const strategyId = mockStrategies[Math.floor(Math.random() * mockStrategies.length)].id;
    const possibleStatuses = ['active', 'paused', 'inactive'] as const;
    const newStatus = possibleStatuses[Math.floor(Math.random() * possibleStatuses.length)];
    
    // Update the mock strategy
    const strategy = mockStrategies.find(s => s.id === strategyId);
    if (strategy) {
      strategy.status = newStatus;
      strategy.updatedAt = new Date().toISOString();
    }
    
    return {
      id: strategyId,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };
  }

  // Simulate trade execution by strategy
  function simulateTradeExecution(strategy: Strategy): TradeExecution {
    // Determine trade direction (buy or sell)
    const isBuy = Math.random() > 0.5;
    
    // Choose a random coin from the mock coins
    const randomCoin = mockCoins[Math.floor(Math.random() * mockCoins.length)];
    const symbol = randomCoin.symbol;
    
    // Determine trade amount (0.01 to 1.0 units)
    const amount = parseFloat((Math.random() * 0.99 + 0.01).toFixed(2));
    
    // Get the current price
    const price = getCoinPrice(symbol);
    
    return {
      id: `trade-${uuidv4().substring(0, 8)}`,
      symbol: symbol,
      price: price,
      amount: amount,
      side: isBuy ? 'buy' : 'sell',
      timestamp: new Date().toISOString(),
      total: amount * price,
      fee: amount * price * 0.001,
      status: 'completed',
      executedBy: 'agent' as const,
      agentId: strategy.id,
      orderId: `ord-${uuidv4().substring(0, 8)}`,
      exchange: 'TradingFarm'
    };
  }

  // Simulate agent status updates
  function startAgentStatusUpdates() {
    // Send initial agent statuses
    emitFromServer(TRADING_EVENTS.AGENT_STATUS, mockAgents);
    
    // Update agent status periodically
    const intervalId = setInterval(() => {
      // Update a random agent performance metrics
      const agentIndex = Math.floor(Math.random() * mockAgents.length);
      const agent = mockAgents[agentIndex];
      
      // Update agent metrics
      agent.lastActive = new Date().toISOString();
      agent.performance = {
        daily: Number((agent.performance.daily + (Math.random() * 0.4 - 0.2)).toFixed(2)),
        weekly: agent.performance.weekly,
        monthly: agent.performance.monthly
      };
      agent.trades = (agent.trades || 0) + (Math.random() > 0.7 ? 1 : 0);
      
      // Sometimes change agent status
      if (Math.random() > 0.9) {
        const statuses: ('active' | 'paused' | 'error' | 'stopped')[] = ['active', 'paused', 'error', 'stopped'];
        agent.status = statuses[Math.floor(Math.random() * statuses.length)];
      }
      
      // Send updated agent statuses
      emitFromServer(TRADING_EVENTS.AGENT_STATUS, mockAgents);
    }, 12000);
    
    // Clean up interval when socket disconnects
    socket.on("disconnect", () => {
      clearInterval(intervalId);
    });
  }

  // Simulate strategy performance update
  function simulateStrategyPerformanceUpdate(): StrategyPerformanceUpdate {
    const strategyId = mockStrategies[Math.floor(Math.random() * mockStrategies.length)].id;
    const strategy = mockStrategies.find(s => s.id === strategyId);
    
    // Generate performance data
    const newPerformance = strategy ? 
      (typeof strategy.performance === 'string' ? 
        parseFloat(strategy.performance.replace('%', '')) : strategy.performance) + (Math.random() * 0.4 - 0.2)
      : Math.random() * 10 - 2;
      
    const newWinRate = Math.min(0.95, Math.max(0.3, Math.random()));
    const newTotalTrades = strategy && strategy.totalTrades ? 
      strategy.totalTrades + (Math.random() > 0.7 ? 1 : 0)
      : Math.floor(Math.random() * 50) + 10;
      
    // Update the mock strategy
    if (strategy) {
      strategy.performance = newPerformance;
      strategy.winRate = newWinRate;
      strategy.totalTrades = newTotalTrades;
      strategy.updatedAt = new Date().toISOString();
    }
    
    return {
      id: strategyId,
      performance: newPerformance,
      metrics: {
        winRate: newWinRate,
        sharpeRatio: Number((Math.random() * 3).toFixed(2)),
        maxDrawdown: Number((Math.random() * 15).toFixed(2)),
        averageReturn: Number((Math.random() * 2 - 0.5).toFixed(2)),
        profitFactor: Number((Math.random() * 2 + 0.8).toFixed(2))
      },
      updatedAt: new Date().toISOString()
    };
  }
  
  // Simulate trades for strategies
  function simulateTrades() {
    // Only simulate trades for active strategies
    const activeStrategies = mockStrategies.filter(s => s.status === 'active');
    
    if (activeStrategies.length > 0) {
      // Randomly select a strategy to execute a trade
      const strategy = activeStrategies[Math.floor(Math.random() * activeStrategies.length)];
      
      // 30% chance of trade execution
      if (Math.random() < 0.3) {
        // Simulate a trade execution
        const trade = simulateTradeExecution(strategy);
        
        // Emit the trade event
        emitFromServer(TRADING_EVENTS.TRADE_EXECUTED, trade);
        
        // Update strategy stats
        if (strategy) {
          strategy.activeTrades = Math.max(0, (strategy.activeTrades || 0) + (Math.random() > 0.5 ? 1 : -1));
          strategy.totalTrades = (strategy.totalTrades || 0) + 1;
          strategy.updatedAt = new Date().toISOString();
        }
      }
    }
  }

  // Simulate periodic performance updates
  function startPerformanceUpdates() {
    // Initial update
    // Send initial strategy performance
    setTimeout(() => {
      emitFromServer(TRADING_EVENTS.GET_STRATEGY_PERFORMANCE, mockStrategies);
    }, 1000);
    
    // Schedule periodic updates
    const intervalId = setInterval(() => {
      // Randomly select a strategy to update
      const randomIndex = Math.floor(Math.random() * mockStrategies.length);
      const strategy = mockStrategies[randomIndex];
      
      // Don't update inactive strategies
      if (strategy.status === 'inactive') return;
      
      // Generate a performance change (-0.5% to +0.5%)
      const performanceChange = parseFloat((Math.random() * 1 - 0.5).toFixed(1));
      const currentPerformance = typeof strategy.performance === 'string' ?
        parseFloat(strategy.performance.replace('%', '')) : 
        strategy.performance;
      const newPerformance = currentPerformance + performanceChange;
      
      // Update strategy performance
      strategy.performance = newPerformance;
      strategy.updatedAt = new Date().toISOString();
      
      const performanceUpdate: StrategyPerformanceUpdate = {
        id: strategy.id,
        performance: newPerformance,
        metrics: {
          sharpeRatio: parseFloat((Math.random() * 3).toFixed(2)),
          maxDrawdown: parseFloat((Math.random() * 15).toFixed(2)),
          winRate: strategy.winRate,
          averageReturn: parseFloat((Math.random() * 2 - 0.5).toFixed(2)),
          profitFactor: parseFloat((Math.random() * 2 + 0.8).toFixed(2))
        },
        updatedAt: strategy.updatedAt
      };
      
      // Emit performance update
      emitFromServer(TRADING_EVENTS.STRATEGY_PERFORMANCE_UPDATE, performanceUpdate);
      
    }, 15000); // Every 15 seconds
    
    // Clean up interval when socket disconnects
    socket.on("disconnect", () => {
      clearInterval(intervalId);
    });
  }

  // Start periodic updates
  startMarketUpdates();
  startPerformanceUpdates();
  startAgentStatusUpdates();
  
  // Simulate trades periodically
  const tradeIntervalId = setInterval(() => {
    // Only simulate trades for active strategies
    const activeStrategies = mockStrategies.filter(s => s.status === 'active');
    
    if (activeStrategies.length > 0) {
      // Randomly select a strategy to execute a trade
      const strategy = activeStrategies[Math.floor(Math.random() * activeStrategies.length)];
      
      // 30% chance of trade execution
      if (Math.random() < 0.3) {
        // Simulate a trade execution
        const trade = simulateTradeExecution(strategy);
        
        // Emit the trade event
        emitFromServer(TRADING_EVENTS.TRADE_EXECUTED, trade);
        
        // Update strategy stats
        if (strategy) {
          strategy.activeTrades = Math.max(0, (strategy.activeTrades || 0) + (Math.random() > 0.5 ? 1 : -1));
          strategy.totalTrades = (strategy.totalTrades || 0) + 1;
          strategy.updatedAt = new Date().toISOString();
        }
      }
    }
  }, 15000);
  
  // Clean up interval when socket disconnects
  socket.on("disconnect", () => {
    clearInterval(tradeIntervalId);
  });

  // Initial data emission
  sendMarketUpdate();
  setTimeout(() => {
    emitFromServer(TRADING_EVENTS.GET_STRATEGIES, mockStrategies);
  }, 1000);
}
