const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Set up CORS for Express
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Trading events constants (must match client-side)
const TRADING_EVENTS = {
  CONNECTION: "connect",
  DISCONNECT: "disconnect",
  MARKET_UPDATE: "market_update",
  MARKET_SUBSCRIBE: "market_subscribe",
  MARKET_UNSUBSCRIBE: "market_unsubscribe",
  TRADE_EXECUTION: "trade_execution",
  ORDER_CREATED: "order_created",
  ORDER_UPDATED: "order_updated",
  ORDER_CANCELLED: "order_cancelled",
  PORTFOLIO_UPDATE: "portfolio_update",
  AGENT_STATUS: "agent_status",
  AGENT_ACTION: "agent_action",
  AGENT_COMMAND: "agent_command",
  SYSTEM_ALERT: "system_alert",
  SYSTEM_STATUS: "system_status",
  KNOWLEDGE_UPDATE: "knowledge_update",
  AI_INSIGHT: "ai_insight",
  FARM_STATUS: "farm_status",
  BOSSMAN_MESSAGE: "bossman_message",
  COMMAND_SEND: "command:send",
  COMMAND_RESPONSE: "command:response",
  COMMAND_ERROR: "command:error",
  SYSTEM_MESSAGE: "system:message"
};

// Mock data for market prices
const marketData = {
  'BTC/USD': { price: 65000, change: 2.5, volume: 1250000 },
  'ETH/USD': { price: 3200, change: 1.8, volume: 950000 },
  'SOL/USD': { price: 145, change: 4.2, volume: 650000 },
  'BNB/USD': { price: 580, change: 0.8, volume: 450000 },
  'XRP/USD': { price: 0.58, change: -1.2, volume: 320000 }
};

// Mock portfolio data
const portfolioData = {
  totalValue: 125000,
  dailyChange: 3.2,
  assets: [
    { symbol: 'BTC', amount: 1.2, valueUSD: 78000 },
    { symbol: 'ETH', amount: 15, valueUSD: 48000 },
    { symbol: 'SOL', amount: 65, valueUSD: 9425 }
  ],
  history: []
};

// Generate portfolio history data
for (let i = 0; i < 24; i++) {
  portfolioData.history.push({
    timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
    value: 115000 + Math.random() * 15000
  });
}

// Mock agent status data
const agentData = [
  { id: 'agent-1', name: 'BTC Momentum Trader', status: 'active', performance: 2.8 },
  { id: 'agent-2', name: 'ETH Arbitrage Bot', status: 'active', performance: 1.5 },
  { id: 'agent-3', name: 'SOL DCA Bot', status: 'paused', performance: 3.2 },
  { id: 'agent-4', name: 'BNB Market Maker', status: 'active', performance: -0.5 }
];

// Mock recent trades data
const recentTrades = [
  { id: 'trade-1', symbol: 'BTC/USD', side: 'buy', amount: 0.05, price: 64800, timestamp: new Date(Date.now() - 120000).toISOString() },
  { id: 'trade-2', symbol: 'ETH/USD', side: 'sell', amount: 1.2, price: 3180, timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: 'trade-3', symbol: 'SOL/USD', side: 'buy', amount: 5, price: 143.5, timestamp: new Date(Date.now() - 600000).toISOString() }
];

// ElizaOS knowledge base mock responses
const knowledgeBase = {
  'market': 'Market analysis shows increasing correlation between BTC price movements and traditional market indicators like the S&P 500.',
  'bitcoin': 'Bitcoin (BTC) is the first decentralized cryptocurrency, created in 2009 by an unknown person using the pseudonym Satoshi Nakamoto.',
  'ethereum': 'Ethereum (ETH) is a decentralized, open-source blockchain with smart contract functionality. It was proposed in 2013 by Vitalik Buterin.',
  'strategy': 'The Trading Farm currently supports multiple strategy types including momentum, mean reversion, trend following, and arbitrage.',
  'agents': 'Agent-based trading allows for autonomous execution based on predefined strategies with built-in risk management.',
  'portfolio': 'Portfolio management features include dynamic allocation, rebalancing, risk scoring, and performance tracking.',
  'RSI': 'Relative Strength Index (RSI) is a momentum oscillator that measures the speed and change of price movements. Values above 70 indicate overbought conditions, while values below 30 suggest oversold conditions.',
  'default': 'I\'m not finding detailed information on that topic in my knowledge base. Would you like me to add this to our research queue?'
};

// Socket connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  let subscribedSymbols = ['BTC/USD', 'ETH/USD']; // Default subscriptions
  
  // Send initial data
  socket.emit(TRADING_EVENTS.SYSTEM_MESSAGE, 'Connected to Trading Farm server');
  
  // Market data subscription handler
  socket.on(TRADING_EVENTS.MARKET_SUBSCRIBE, (data) => {
    console.log('Market subscribe:', data);
    if (data && data.symbols && Array.isArray(data.symbols)) {
      subscribedSymbols = [...new Set([...subscribedSymbols, ...data.symbols])];
      socket.emit(TRADING_EVENTS.SYSTEM_MESSAGE, `Subscribed to ${data.symbols.join(', ')}`);
      
      // Send immediate update for newly subscribed symbols
      data.symbols.forEach(symbol => {
        if (marketData[symbol]) {
          socket.emit(TRADING_EVENTS.MARKET_UPDATE, {
            symbol,
            ...marketData[symbol],
            timestamp: new Date().toISOString()
          });
        }
      });
    }
  });
  
  // Market data unsubscribe handler
  socket.on(TRADING_EVENTS.MARKET_UNSUBSCRIBE, (data) => {
    console.log('Market unsubscribe:', data);
    if (data && data.symbols && Array.isArray(data.symbols)) {
      subscribedSymbols = subscribedSymbols.filter(symbol => !data.symbols.includes(symbol));
      socket.emit(TRADING_EVENTS.SYSTEM_MESSAGE, `Unsubscribed from ${data.symbols.join(', ')}`);
    }
  });
  
  // Command handler with ElizaOS integration
  socket.on(TRADING_EVENTS.COMMAND_SEND, (data) => {
    console.log('Command received:', data);
    
    if (!data || !data.command) {
      socket.emit(TRADING_EVENTS.COMMAND_ERROR, 'Invalid command format');
      return;
    }
    
    const command = data.command.toLowerCase();
    
    // Simulate processing delay for more realistic experience
    setTimeout(() => {
      processCommand(socket, command);
    }, 500);
  });
  
  // Simulate periodic market updates
  const marketUpdateInterval = setInterval(() => {
    subscribedSymbols.forEach(symbol => {
      if (marketData[symbol]) {
        // Update prices with small random fluctuations
        const randomChange = (Math.random() - 0.5) * 0.2; // -0.1% to +0.1%
        marketData[symbol].price *= (1 + randomChange/100);
        marketData[symbol].change += randomChange;
        marketData[symbol].volume += Math.random() * 1000 - 500;
        
        socket.emit(TRADING_EVENTS.MARKET_UPDATE, {
          symbol,
          ...marketData[symbol],
          price: parseFloat(marketData[symbol].price.toFixed(2)),
          change: parseFloat(marketData[symbol].change.toFixed(2)),
          volume: Math.round(marketData[symbol].volume),
          timestamp: new Date().toISOString()
        });
      }
    });
  }, 5000); // Update every 5 seconds
  
  // Simulate periodic portfolio updates
  const portfolioUpdateInterval = setInterval(() => {
    // Update portfolio total value based on market changes
    const randomChange = (Math.random() - 0.5) * 0.2; // -0.1% to +0.1%
    portfolioData.totalValue *= (1 + randomChange/100);
    
    // Add new history point
    portfolioData.history.push({
      timestamp: new Date().toISOString(),
      value: portfolioData.totalValue
    });
    
    // Keep only last 24 hours
    if (portfolioData.history.length > 24) {
      portfolioData.history.shift();
    }
    
    socket.emit(TRADING_EVENTS.PORTFOLIO_UPDATE, {
      ...portfolioData,
      totalValue: parseFloat(portfolioData.totalValue.toFixed(2)),
      timestamp: new Date().toISOString()
    });
  }, 15000); // Update every 15 seconds
  
  // Simulate occasional trade executions
  const tradeExecutionInterval = setInterval(() => {
    if (Math.random() > 0.7) { // 30% chance of trade execution
      const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD'];
      const sides = ['buy', 'sell'];
      
      const trade = {
        id: `trade-${Date.now()}`,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        side: sides[Math.floor(Math.random() * sides.length)],
        amount: parseFloat((Math.random() * 0.1).toFixed(3)),
        price: marketData[symbols[0]].price,
        timestamp: new Date().toISOString()
      };
      
      recentTrades.unshift(trade);
      if (recentTrades.length > 50) recentTrades.pop();
      
      socket.emit(TRADING_EVENTS.TRADE_EXECUTION, trade);
    }
  }, 10000); // Check every 10 seconds
  
  // Simulate periodic agent status updates
  const agentUpdateInterval = setInterval(() => {
    agentData.forEach(agent => {
      // Randomly update performance
      agent.performance += (Math.random() - 0.5) * 0.2;
      agent.performance = parseFloat(agent.performance.toFixed(2));
      
      // Occasionally change status
      if (Math.random() > 0.9) {
        agent.status = agent.status === 'active' ? 'paused' : 'active';
      }
    });
    
    socket.emit(TRADING_EVENTS.AGENT_STATUS, {
      agents: agentData,
      timestamp: new Date().toISOString()
    });
  }, 20000); // Update every 20 seconds
  
  // Simulate occasional system alerts
  const systemAlertInterval = setInterval(() => {
    if (Math.random() > 0.8) { // 20% chance of alert
      const alertTypes = ['info', 'warning', 'error'];
      const alertSources = ['system', 'market', 'security'];
      const alertMessages = [
        'Unusual market volatility detected',
        'API rate limit at 80% capacity',
        'New trading strategy deployed',
        'System maintenance scheduled',
        'Exchange connection latency increased'
      ];
      
      const alert = {
        id: `alert-${Date.now()}`,
        type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
        source: alertSources[Math.floor(Math.random() * alertSources.length)],
        message: alertMessages[Math.floor(Math.random() * alertMessages.length)],
        timestamp: new Date().toISOString()
      };
      
      socket.emit(TRADING_EVENTS.SYSTEM_ALERT, alert);
    }
  }, 30000); // Check every 30 seconds
  
  // Clean up on disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clearInterval(marketUpdateInterval);
    clearInterval(portfolioUpdateInterval);
    clearInterval(tradeExecutionInterval);
    clearInterval(agentUpdateInterval);
    clearInterval(systemAlertInterval);
  });
});

// ElizaOS command processing function
function processCommand(socket, command) {
  console.log('Processing command:', command);
  
  // Simple command parser
  if (command.includes('help')) {
    socket.emit(TRADING_EVENTS.COMMAND_RESPONSE, 
      "Available commands:\n" +
      "- market watch [symbol]  - Subscribe to market updates\n" +
      "- portfolio  - Get portfolio summary\n" +
      "- agent status  - Get all agent statuses\n" +
      "- buy/sell [symbol] [amount]  - Place an order\n" +
      "- knowledge [topic]  - Query the knowledge base\n" +
      "- help  - Show this help message\n\n" +
      "You can also use natural language to ask questions!"
    );
  } 
  else if (command.startsWith('market watch') || command.includes('price')) {
    // Extract symbols from command
    let symbols = [];
    
    if (command.startsWith('market watch')) {
      const parts = command.split('market watch')[1].trim().split(' ');
      symbols = parts.filter(part => part.includes('/'));
    } else {
      // Extract from natural language
      ['btc', 'bitcoin', 'eth', 'ethereum', 'sol', 'solana', 'bnb', 'xrp'].forEach(coin => {
        if (command.toLowerCase().includes(coin)) {
          const symbol = `${coin.toUpperCase()}/USD`;
          symbols.push(symbol);
        }
      });
      
      // Default to BTC if no specific coin mentioned
      if (symbols.length === 0 && command.includes('price')) {
        symbols = ['BTC/USD'];
      }
    }
    
    if (symbols.length === 0) {
      socket.emit(TRADING_EVENTS.COMMAND_ERROR, 'Please specify which markets to watch (e.g., market watch BTC/USD ETH/USD)');
    } else {
      // Subscribe to specified symbols
      socket.emit(TRADING_EVENTS.SYSTEM_MESSAGE, `Subscribing to ${symbols.join(', ')}`);
      
      // Send market data for each symbol
      symbols.forEach(symbol => {
        if (marketData[symbol]) {
          // Prepare ElizaOS style response
          const priceInfo = marketData[symbol];
          const direction = priceInfo.change >= 0 ? 'up' : 'down';
          const changeAbs = Math.abs(priceInfo.change);
          
          setTimeout(() => {
            socket.emit(TRADING_EVENTS.COMMAND_RESPONSE, 
              `${symbol} is currently trading at $${priceInfo.price.toFixed(2)}, ${direction} ${changeAbs.toFixed(2)}% in the last 24 hours with a volume of $${(priceInfo.volume/1000).toFixed(1)}K.`
            );
          }, 300);
        } else {
          socket.emit(TRADING_EVENTS.COMMAND_ERROR, `Market data not available for ${symbol}`);
        }
      });
    }
  }
  else if (command.includes('portfolio') || command.includes('my holdings')) {
    // Format portfolio data for display
    const response = `Portfolio Summary:\n` +
      `Total Value: $${portfolioData.totalValue.toFixed(2)}\n` +
      `24h Change: ${portfolioData.dailyChange >= 0 ? '+' : ''}${portfolioData.dailyChange.toFixed(2)}%\n\n` +
      `Assets:\n` +
      portfolioData.assets.map(asset => 
        `${asset.symbol}: ${asset.amount} (${((asset.valueUSD / portfolioData.totalValue) * 100).toFixed(1)}% of portfolio)`
      ).join('\n');
    
    socket.emit(TRADING_EVENTS.COMMAND_RESPONSE, response);
    
    // Send portfolio update event to update charts
    socket.emit(TRADING_EVENTS.PORTFOLIO_UPDATE, {
      ...portfolioData,
      timestamp: new Date().toISOString()
    });
  }
  else if (command.includes('agent') || command.includes('bot')) {
    // Format agent data for display
    const response = `Agent Status Report:\n` +
      agentData.map(agent => 
        `${agent.name}: ${agent.status.toUpperCase()} (${agent.performance >= 0 ? '+' : ''}${agent.performance.toFixed(2)}% performance)`
      ).join('\n');
    
    socket.emit(TRADING_EVENTS.COMMAND_RESPONSE, response);
    
    // Send agent status update event
    socket.emit(TRADING_EVENTS.AGENT_STATUS, {
      agents: agentData,
      timestamp: new Date().toISOString()
    });
  }
  else if (command.startsWith('buy') || command.startsWith('sell')) {
    // Parse order command
    const parts = command.split(' ');
    const side = parts[0].toLowerCase();
    const symbol = parts[1]?.toUpperCase();
    const amount = parseFloat(parts[2] || 0);
    
    if (!symbol || !amount) {
      socket.emit(TRADING_EVENTS.COMMAND_ERROR, `Invalid ${side} order. Format: ${side} [symbol] [amount]`);
      return;
    }
    
    // Create mock order
    const symbolWithUSD = `${symbol}/USD`;
    if (!marketData[symbolWithUSD]) {
      socket.emit(TRADING_EVENTS.COMMAND_ERROR, `Market data not available for ${symbolWithUSD}`);
      return;
    }
    
    const order = {
      id: `order-${Date.now()}`,
      symbol: symbolWithUSD,
      side,
      amount,
      price: marketData[symbolWithUSD].price,
      total: amount * marketData[symbolWithUSD].price,
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    // Simulate order processing
    socket.emit(TRADING_EVENTS.COMMAND_RESPONSE, `Processing ${side} order for ${amount} ${symbol} at approximately $${order.price.toFixed(2)}...`);
    
    // Simulate order execution after delay
    setTimeout(() => {
      order.status = 'executed';
      
      // Create trade record
      const trade = {
        id: `trade-${Date.now()}`,
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        amount: order.amount,
        price: order.price * (1 + (Math.random() - 0.5) * 0.002), // Small slippage
        timestamp: new Date().toISOString()
      };
      
      // Update portfolio (simplified)
      if (side === 'buy') {
        // Find or add asset
        const assetIndex = portfolioData.assets.findIndex(a => a.symbol === symbol);
        if (assetIndex >= 0) {
          portfolioData.assets[assetIndex].amount += amount;
          portfolioData.assets[assetIndex].valueUSD += trade.amount * trade.price;
        } else {
          portfolioData.assets.push({
            symbol,
            amount,
            valueUSD: trade.amount * trade.price
          });
        }
      } else {
        // Find asset and reduce amount
        const assetIndex = portfolioData.assets.findIndex(a => a.symbol === symbol);
        if (assetIndex >= 0) {
          portfolioData.assets[assetIndex].amount -= amount;
          portfolioData.assets[assetIndex].valueUSD -= trade.amount * trade.price;
          
          // Remove asset if amount is zero or negative
          if (portfolioData.assets[assetIndex].amount <= 0) {
            portfolioData.assets.splice(assetIndex, 1);
          }
        }
      }
      
      // Add trade to recent trades
      recentTrades.unshift(trade);
      if (recentTrades.length > 50) recentTrades.pop();
      
      // Emit events
      socket.emit(TRADING_EVENTS.TRADE_EXECUTION, trade);
      socket.emit(TRADING_EVENTS.COMMAND_RESPONSE, 
        `Order executed: ${side.toUpperCase()} ${amount} ${symbol} at $${trade.price.toFixed(2)} for a total of $${(trade.amount * trade.price).toFixed(2)}`
      );
      
      // Update portfolio data
      socket.emit(TRADING_EVENTS.PORTFOLIO_UPDATE, {
        ...portfolioData,
        timestamp: new Date().toISOString()
      });
      
    }, 2000);
  }
  else if (command.startsWith('knowledge') || command.includes('explain') || command.includes('what is')) {
    // Extract topic from command
    let topic = '';
    
    if (command.startsWith('knowledge')) {
      topic = command.split('knowledge')[1].trim().toLowerCase();
    } else {
      // Extract from natural language
      const patterns = [
        /explain\s+([a-z0-9 ]+)/i,
        /what\s+is\s+([a-z0-9 ]+)/i,
        /tell\s+me\s+about\s+([a-z0-9 ]+)/i
      ];
      
      for (const pattern of patterns) {
        const match = command.match(pattern);
        if (match && match[1]) {
          topic = match[1].trim().toLowerCase();
          break;
        }
      }
    }
    
    if (!topic) {
      socket.emit(TRADING_EVENTS.COMMAND_ERROR, 'Please specify a topic to query (e.g., knowledge bitcoin)');
      return;
    }
    
    // Search knowledge base
    let response = '';
    for (const [key, value] of Object.entries(knowledgeBase)) {
      if (topic.includes(key)) {
        response = value;
        break;
      }
    }
    
    if (!response) {
      response = knowledgeBase.default;
    }
    
    // Format and emit response
    socket.emit(TRADING_EVENTS.COMMAND_RESPONSE, response);
    
    // Also emit knowledge update event
    socket.emit(TRADING_EVENTS.KNOWLEDGE_UPDATE, {
      topic,
      content: response,
      timestamp: new Date().toISOString()
    });
  }
  else {
    // Try to handle as natural language query
    if (command.includes('btc') || command.includes('bitcoin') || 
        command.includes('eth') || command.includes('price')) {
      // Likely asking about market price
      processCommand(socket, 'market watch BTC/USD');
    }
    else if (command.includes('portfolio') || command.includes('holding') || 
             command.includes('balance') || command.includes('my')) {
      // Likely asking about portfolio
      processCommand(socket, 'portfolio');
    }
    else if (command.includes('agent') || command.includes('bot') || 
             command.includes('status') || command.includes('running')) {
      // Likely asking about agents
      processCommand(socket, 'agent status');
    }
    else {
      // General ElizaOS response for unknown commands
      socket.emit(TRADING_EVENTS.COMMAND_RESPONSE, 
        "I'm not sure how to process that command. Try 'help' to see available commands, or phrase your request differently."
      );
    }
  }
}

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Trading Farm Socket.IO server running on port ${PORT}`);
});
