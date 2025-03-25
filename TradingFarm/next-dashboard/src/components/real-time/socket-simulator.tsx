"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/components/ui/utils";
import { MarketUpdate } from "@/hooks/use-socket-market";
import { TradeExecution } from "@/hooks/use-socket-trades";
import { PortfolioUpdate } from "@/hooks/use-socket-portfolio";
import { AgentUpdate, AgentStatus } from "@/hooks/use-socket-agents";
import { SystemAlert, AlertSeverity } from "@/hooks/use-socket-alerts";
import { Bot, LineChart, ArrowDownRight, ArrowUpRight, Bell, Wallet } from "lucide-react";
import { TRADING_EVENTS } from "@/constants/events"; 
import { EventEmitter } from "events";

// Mock socket event emitter
const eventEmitter = new EventEmitter();

// Export the mock socket emitter that simulates the socket.io client
export const mockSocketEmitter = {
  id: 'mock-socket',
  connected: true,
  disconnected: false,
  
  // Mock event handlers
  eventHandlers: {} as Record<string, Function[]>,
  
  // Connection methods
  connect: () => {},
  disconnect: () => {},
  
  // Event registration
  on: function(event: string, callback: Function) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
    return this;
  },
  
  off: function(event: string, callback?: Function) {
    if (!callback) {
      delete this.eventHandlers[event];
    } else if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(cb => cb !== callback);
    }
    return this;
  },
  
  // Event emission
  emit: function(event: string, ...args: any[]) {
    if (event === 'command:send' && args[0] && args[0].command) {
      // Handle command messages - this simulates the server handling commands
      setTimeout(() => {
        this.handleCommand(args[0].command);
      }, 500); // Add a small delay to simulate network latency
    }
    return true;
  },
  
  // Internal method to emit to registered handlers
  _emit: function(event: string, ...args: any[]) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(callback => {
        callback(...args);
      });
    }
  },
  
  // Command handling
  handleCommand: (commandText: string) => {
    console.log(`[MOCK] Processing command: ${commandText}`);
    
    setTimeout(() => {
      const command = commandText.toLowerCase().trim();
      
      // Simulate command processing
      if (command === 'help') {
        eventEmitter.emit(TRADING_EVENTS.COMMAND_RESPONSE, {
          message: `Available commands:
- market watch [symbol]: Get latest market data for a symbol
- buy [symbol] [amount]: Place a buy order
- sell [symbol] [amount]: Place a sell order
- portfolio: View your current portfolio
- agent status: Check the status of trading agents
- knowledge [query]: Search the knowledge base
- help: Show this help message`
        });
      } 
      else if (command.startsWith('market watch')) {
        const symbol = command.replace('market watch', '').trim() || 'BTC/USD';
        eventEmitter.emit(TRADING_EVENTS.COMMAND_RESPONSE, {
          message: `Latest market data for ${symbol}:
Price: $${(Math.random() * 10000 + 20000).toFixed(2)}
24h Change: ${(Math.random() * 10 - 5).toFixed(2)}%
24h Volume: $${(Math.random() * 1000000000).toFixed(0)}
Bid/Ask Spread: $${(Math.random() * 10).toFixed(2)}`
        });
        
        // Also emit a market update
        eventEmitter.emit(TRADING_EVENTS.MARKET_UPDATE, generateMarketData([symbol]));
      }
      else if (command.startsWith('buy')) {
        const parts = command.split(' ');
        const symbol = parts[1] || 'BTC/USD';
        const amount = parts[2] || '0.1';
        
        eventEmitter.emit(TRADING_EVENTS.COMMAND_RESPONSE, {
          message: `Buy order placed for ${amount} ${symbol} at market price.
Order ID: ORD-${Math.floor(Math.random() * 1000000)}
Estimated execution price: $${(Math.random() * 10000 + 20000).toFixed(2)}
Order status: Pending`
        });
        
        // Simulate order execution after a delay
        setTimeout(() => {
          const price = (Math.random() * 10000 + 20000).toFixed(2);
          eventEmitter.emit(TRADING_EVENTS.TRADE_EXECUTION, {
            id: `TX-${Math.floor(Math.random() * 1000000)}`,
            symbol,
            price: parseFloat(price),
            amount: parseFloat(amount),
            side: 'buy',
            timestamp: new Date().toISOString(),
            total: parseFloat(price) * parseFloat(amount),
            fee: parseFloat(price) * parseFloat(amount) * 0.001,
          });
          
          eventEmitter.emit(TRADING_EVENTS.SYSTEM_MESSAGE, {
            message: `Buy order for ${amount} ${symbol} executed at $${price}.`
          });
          
          // Also update portfolio
          setTimeout(() => {
            eventEmitter.emit(TRADING_EVENTS.PORTFOLIO_UPDATE, generatePortfolioUpdate());
          }, 1000);
          
        }, 3000);
      }
      else if (command.startsWith('sell')) {
        const parts = command.split(' ');
        const symbol = parts[1] || 'BTC/USD';
        const amount = parts[2] || '0.1';
        
        eventEmitter.emit(TRADING_EVENTS.COMMAND_RESPONSE, {
          message: `Sell order placed for ${amount} ${symbol} at market price.
Order ID: ORD-${Math.floor(Math.random() * 1000000)}
Estimated execution price: $${(Math.random() * 10000 + 20000).toFixed(2)}
Order status: Pending`
        });
        
        // Simulate order execution after a delay
        setTimeout(() => {
          const price = (Math.random() * 10000 + 20000).toFixed(2);
          eventEmitter.emit(TRADING_EVENTS.TRADE_EXECUTION, {
            id: `TX-${Math.floor(Math.random() * 1000000)}`,
            symbol,
            price: parseFloat(price),
            amount: parseFloat(amount),
            side: 'sell',
            timestamp: new Date().toISOString(),
            total: parseFloat(price) * parseFloat(amount),
            fee: parseFloat(price) * parseFloat(amount) * 0.001,
          });
          
          eventEmitter.emit(TRADING_EVENTS.SYSTEM_MESSAGE, {
            message: `Sell order for ${amount} ${symbol} executed at $${price}.`
          });
          
          // Also update portfolio
          setTimeout(() => {
            eventEmitter.emit(TRADING_EVENTS.PORTFOLIO_UPDATE, generatePortfolioUpdate());
          }, 1000);
          
        }, 3000);
      }
      else if (command === 'portfolio') {
        eventEmitter.emit(TRADING_EVENTS.COMMAND_RESPONSE, {
          message: `Current Portfolio:
Total Value: $${(Math.random() * 100000 + 50000).toFixed(2)}
24h Change: ${(Math.random() * 10 - 3).toFixed(2)}%
Assets:
- BTC: ${(Math.random() * 5).toFixed(4)} ($${(Math.random() * 50000 + 30000).toFixed(2)})
- ETH: ${(Math.random() * 50).toFixed(4)} ($${(Math.random() * 20000 + 10000).toFixed(2)})
- SOL: ${(Math.random() * 500).toFixed(4)} ($${(Math.random() * 10000 + 5000).toFixed(2)})
- USDT: ${(Math.random() * 20000 + 10000).toFixed(2)} ($${(Math.random() * 20000 + 10000).toFixed(2)})`
        });
        
        // Also emit a portfolio update
        eventEmitter.emit(TRADING_EVENTS.PORTFOLIO_UPDATE, generatePortfolioUpdate());
      }
      else if (command === 'agent status') {
        eventEmitter.emit(TRADING_EVENTS.COMMAND_RESPONSE, {
          message: `Trading Agent Status:
- TrendMaster: Active (Performance: +8.5%)
- SwingTrader: Active (Performance: +12.3%)
- StableCoin Arbitrageur: Paused
- DeFi Scout: Active (Performance: +3.7%)
- Volatility Hunter: Active (Performance: -2.1%)
- LongTerm Hodler: Active (Performance: +24.5%)`
        });
        
        // Also emit an agent status update
        eventEmitter.emit(TRADING_EVENTS.AGENT_STATUS, generateAgentStatus(6));
      }
      else if (command.startsWith('knowledge')) {
        const query = command.replace('knowledge', '').trim() || 'trading strategies';
        eventEmitter.emit(TRADING_EVENTS.COMMAND_RESPONSE, {
          message: `Knowledge Base Results for "${query}":
1. Research report on ${query} (97% relevance)
2. Market analysis including ${query} (85% relevance)
3. BossMan strategic document on ${query} (82% relevance)
4. ElizaOS intelligence report mentioning ${query} (78% relevance)
5. Trading playbook section on ${query} (73% relevance)

Would you like me to retrieve any specific document?`
        });
        
        // Emit a knowledge update event
        eventEmitter.emit(TRADING_EVENTS.KNOWLEDGE_UPDATE, {
          query,
          results: 5,
          timestamp: new Date().toISOString()
        });
      }
      else {
        eventEmitter.emit(TRADING_EVENTS.COMMAND_ERROR, {
          message: `Unknown command: ${commandText}. Type 'help' to see available commands.`
        });
      }
    }, 500);
  }
};

// Market data generator
const generateMarketData = (symbols: string[]) => {
  return symbols.reduce((acc, symbol) => {
    const basePrice = {
      'BTC/USD': 50000 + Math.random() * 2000,
      'ETH/USD': 3000 + Math.random() * 200,
      'SOL/USD': 100 + Math.random() * 10,
      'BNB/USD': 500 + Math.random() * 20,
      'XRP/USD': 0.5 + Math.random() * 0.05
    }[symbol] || 100;
    
    const change = (Math.random() * 4) - 2; // -2% to +2%
    
    acc[symbol] = {
      symbol,
      price: basePrice,
      change,
      changePercent: change,
      volume: Math.floor(Math.random() * 1000000),
      high24h: basePrice * 1.05,
      low24h: basePrice * 0.95,
      timestamp: Date.now()
    };
    return acc;
  }, {} as Record<string, MarketUpdate>);
};

// Trade execution generator
const generateTradeExecution = (symbols: string[]): TradeExecution => {
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const side = Math.random() > 0.5 ? 'buy' : 'sell';
  const price = {
    'BTC/USD': 50000 + Math.random() * 2000,
    'ETH/USD': 3000 + Math.random() * 200,
    'SOL/USD': 100 + Math.random() * 10,
    'BNB/USD': 500 + Math.random() * 20,
    'XRP/USD': 0.5 + Math.random() * 0.05
  }[symbol] || 100;
  
  const amount = Math.random() * (side === 'buy' ? 5 : 3);
  
  return {
    id: `trade-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
    symbol,
    side,
    amount,
    price,
    total: amount * price, // Calculate total from amount and price
    timestamp: Date.now(),
    status: Math.random() > 0.9 ? 'pending' : 'executed',
    exchange: Math.random() > 0.5 ? 'Binance' : 'Coinbase',
    agentId: Math.random() > 0.3 ? `Agent-${Math.floor(Math.random() * 10)}` : undefined,
    fee: Math.random() * 0.1 * amount * price,
    txHash: Math.random() > 0.5 ? `0x${Math.random().toString(36).substring(2, 10)}` : undefined
  };
};

// Portfolio update generator
const generatePortfolioUpdate = (): PortfolioUpdate => {
  const baseValue = 100000 + Math.random() * 50000;
  const pnlChange = (Math.random() * 10) - 5; // -5% to +5%
  
  const holdings = [
    {
      symbol: 'BTC',
      amount: 0.5 + Math.random() * 0.2,
      averageEntryPrice: 45000 + Math.random() * 5000,
      currentPrice: 50000 + Math.random() * 2000,
      value: 25000 + Math.random() * 5000,
      pnl: 2500 + Math.random() * 1000,
      pnlPercent: 10 + Math.random() * 5,
      allocation: 25 + Math.random() * 5
    },
    {
      symbol: 'ETH',
      amount: 5 + Math.random() * 2,
      averageEntryPrice: 2800 + Math.random() * 300,
      currentPrice: 3000 + Math.random() * 200,
      value: 15000 + Math.random() * 3000,
      pnl: 1000 + Math.random() * 500,
      pnlPercent: 7 + Math.random() * 5,
      allocation: 15 + Math.random() * 5
    },
    {
      symbol: 'SOL',
      amount: 50 + Math.random() * 20,
      averageEntryPrice: 90 + Math.random() * 10,
      currentPrice: 100 + Math.random() * 10,
      value: 5000 + Math.random() * 1000,
      pnl: 500 + Math.random() * 200,
      pnlPercent: 10 + Math.random() * 5,
      allocation: 5 + Math.random() * 2
    }
  ];
  
  return {
    totalValue: baseValue,
    fiatBalance: baseValue * 0.2,
    cryptoValue: baseValue * 0.8,
    pnl24h: pnlChange,
    pnl24hPercent: pnlChange,
    pnlTotal: pnlChange * 2,
    pnlTotalPercent: pnlChange * 2,
    holdings,
    timestamp: Date.now()
  };
};

// Agent status generator
const generateAgentStatus = (count: number): AgentUpdate[] => {
  const agents: AgentUpdate[] = [];
  
  for (let i = 0; i < count; i++) {
    const status = ['active', 'paused', 'idle', 'error'][Math.floor(Math.random() * 4)] as AgentStatus;
    const performance = (Math.random() * 20) - 5; // -5% to +15%
    
    agents.push({
      id: `agent-${i}`,
      name: `Trading Agent ${i + 1}`,
      type: ['ML', 'Rule-Based', 'Momentum', 'Mean-Reversion'][Math.floor(Math.random() * 4)],
      status,
      farmId: `farm-${Math.floor(i / 3)}`,
      performance,
      trades: Math.floor(Math.random() * 100),
      winRate: 40 + Math.floor(Math.random() * 40),
      lastActivity: Date.now() - Math.floor(Math.random() * 3600000),
      cpuUsage: Math.floor(Math.random() * 100),
      memoryUsage: Math.floor(Math.random() * 100),
      strategiesActive: Math.floor(Math.random() * 5) + 1
    });
  }
  
  return agents;
};

// System alert generator
const generateSystemAlert = (): SystemAlert => {
  const severity: AlertSeverity = ['info', 'warning', 'error', 'success'][Math.floor(Math.random() * 4)] as AlertSeverity;
  const category = ['system', 'trading', 'security', 'knowledge'][Math.floor(Math.random() * 4)];
  const isKnowledge = Math.random() > 0.7 || category === 'knowledge';
  
  const titles = {
    info: ['Market Update', 'Portfolio Rebalanced', 'New Trading Opportunity'],
    warning: ['Unusual Market Activity', 'Low Balance Warning', 'Performance Degradation'],
    error: ['Trade Execution Failed', 'API Connection Error', 'Strategy Failure'],
    success: ['Trade Successfully Executed', 'Portfolio Target Reached', 'Agent Optimization Complete']
  };
  
  const messages = {
    info: ['New market data available for analysis', 'Portfolio has been automatically rebalanced', 'Potential trading opportunity detected'],
    warning: ['Unusual volatility detected in market', 'Account balance below recommended threshold', 'Agent performance below expectations'],
    error: ['Failed to execute trade due to insufficient funds', 'Lost connection to exchange API', 'Trading strategy encountering errors'],
    success: ['Successfully executed trade with positive slippage', 'Portfolio has reached target allocation', 'Agent optimization resulted in improved performance']
  };
  
  const title = titles[severity][Math.floor(Math.random() * titles[severity].length)];
  const message = messages[severity][Math.floor(Math.random() * messages[severity].length)];
  
  return {
    id: `alert-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
    title,
    message: isKnowledge ? `${message}. This information has been analyzed by ElizaOS and may be relevant for knowledge-based decision making.` : message,
    severity,
    category,
    timestamp: Date.now(),
    read: Math.random() > 0.7,
    source: isKnowledge ? 'ElizaOS' : ['System', 'TradingEngine', 'RiskManagement', 'SecurityMonitor'][Math.floor(Math.random() * 4)],
    link: Math.random() > 0.8 ? '#' : undefined,
    actions: Math.random() > 0.6 ? [
      { label: 'Acknowledge', action: 'acknowledge' },
      { label: 'Investigate', action: 'investigate' },
      isKnowledge ? { label: 'Add to Knowledge Base', action: 'store_in_knowledge_base' } : { label: 'Dismiss', action: 'dismiss' }
    ] : []
  };
};

interface SocketSimulatorProps {
  className?: string;
}

export function SocketSimulator({ className }: SocketSimulatorProps) {
  const [isActive, setIsActive] = useState(false);
  const [updateInterval, setUpdateInterval] = useState(3000);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Start/stop the simulator
  useEffect(() => {
    let marketInterval: NodeJS.Timeout;
    let tradeInterval: NodeJS.Timeout;
    let portfolioInterval: NodeJS.Timeout;
    let agentInterval: NodeJS.Timeout;
    let alertInterval: NodeJS.Timeout;
    
    if (isActive) {
      // Initial emit
      mockSocketEmitter.emit(TRADING_EVENTS.MARKET_UPDATE, generateMarketData(["BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD", "XRP/USD"]));
      mockSocketEmitter.emit(TRADING_EVENTS.PORTFOLIO_UPDATE, generatePortfolioUpdate());
      mockSocketEmitter.emit(TRADING_EVENTS.AGENT_STATUS, generateAgentStatus(6));
      
      // Setup intervals
      marketInterval = setInterval(() => {
        mockSocketEmitter.emit(TRADING_EVENTS.MARKET_UPDATE, generateMarketData(["BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD", "XRP/USD"]));
      }, updateInterval);
      
      tradeInterval = setInterval(() => {
        if (Math.random() > 0.3) { // 70% chance of trade
          mockSocketEmitter.emit(TRADING_EVENTS.TRADE_EXECUTION, generateTradeExecution(["BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD", "XRP/USD"]));
        }
      }, updateInterval * 1.5);
      
      portfolioInterval = setInterval(() => {
        mockSocketEmitter.emit(TRADING_EVENTS.PORTFOLIO_UPDATE, generatePortfolioUpdate());
      }, updateInterval * 2);
      
      agentInterval = setInterval(() => {
        mockSocketEmitter.emit(TRADING_EVENTS.AGENT_STATUS, generateAgentStatus(6));
      }, updateInterval * 3);
      
      alertInterval = setInterval(() => {
        if (Math.random() > 0.5) { // 50% chance of alert
          mockSocketEmitter.emit(TRADING_EVENTS.SYSTEM_ALERT, generateSystemAlert());
        }
      }, updateInterval * 4);
    }
    
    return () => {
      clearInterval(marketInterval);
      clearInterval(tradeInterval);
      clearInterval(portfolioInterval);
      clearInterval(agentInterval);
      clearInterval(alertInterval);
    };
  }, [isActive, updateInterval]);
  
  // Manually emit specific events
  const emitMarketUpdate = () => {
    mockSocketEmitter.emit(TRADING_EVENTS.MARKET_UPDATE, generateMarketData(["BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD", "XRP/USD"]));
  };
  
  const emitTradeExecution = () => {
    mockSocketEmitter.emit(TRADING_EVENTS.TRADE_EXECUTION, generateTradeExecution(["BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD", "XRP/USD"]));
  };
  
  const emitPortfolioUpdate = () => {
    mockSocketEmitter.emit(TRADING_EVENTS.PORTFOLIO_UPDATE, generatePortfolioUpdate());
  };
  
  const emitAgentStatus = () => {
    mockSocketEmitter.emit(TRADING_EVENTS.AGENT_STATUS, generateAgentStatus(6));
  };
  
  const emitSystemAlert = () => {
    mockSocketEmitter.emit(TRADING_EVENTS.SYSTEM_ALERT, generateSystemAlert());
  };
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Socket.IO Simulator</CardTitle>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Switch 
              id="simulator-switch" 
              checked={isActive} 
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="simulator-switch">
              {isActive ? "Simulation Running" : "Start Simulation"}
            </Label>
          </div>
          
          <div className="flex flex-col space-y-2">
            <span className="text-sm text-muted-foreground">
              Emit Frequency: {updateInterval/1000}s
            </span>
            <Slider 
              value={[updateInterval]} 
              min={1000} 
              max={10000} 
              step={1000}
              onValueChange={(value) => setUpdateInterval(value[0])}
            />
          </div>
        </div>
        
        <Tabs value="market" onValueChange={(value) => console.log(value)} className="w-full">
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="trade">Trades</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="agent">Agents</TabsTrigger>
            <TabsTrigger value="alert">Alerts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="market" className="pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium mb-1">Market Updates</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate price and market data updates
                  </p>
                </div>
                <Button onClick={emitMarketUpdate} className="gap-2">
                  <LineChart className="h-4 w-4" />
                  Emit Update
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="trade" className="pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium mb-1">Trade Executions</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate trade execution notifications
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={emitTradeExecution} variant="outline" className="gap-2">
                    <ArrowDownRight className="h-4 w-4 text-green-500" />
                    Buy
                  </Button>
                  <Button onClick={emitTradeExecution} variant="outline" className="gap-2">
                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                    Sell
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="portfolio" className="pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium mb-1">Portfolio Updates</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate portfolio value and asset updates
                  </p>
                </div>
                <Button onClick={emitPortfolioUpdate} className="gap-2">
                  <Wallet className="h-4 w-4" />
                  Update Portfolio
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="agent" className="pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium mb-1">Agent Status</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate agent status updates
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="agent-count">Agents:</Label>
                    <Select 
                      value="6" 
                      onValueChange={(value) => console.log(value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[3, 6, 9, 12].map((count) => (
                          <SelectItem key={count} value={count.toString()}>
                            {count}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={emitAgentStatus} className="gap-2">
                    <Bot className="h-4 w-4" />
                    Update Agents
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="alert" className="pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium mb-1">System Alerts</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate system alert notifications
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={emitSystemAlert} className="gap-2">
                    <Bell className="h-4 w-4" />
                    Generate Alert
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Socket simulator for testing real-time components
        </p>
        <Button variant="outline" size="sm" onClick={() => {
          setIsActive(false);
          setTimeout(() => {
            setIsActive(true);
          }, 500);
        }}>
          Reset Simulation
        </Button>
      </CardFooter>
    </Card>
  );
}
