import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Button } from "../ui/button";
import { 
  PanelLeft, 
  PanelRight, 
  Layout, 
  Brain, 
  Zap, 
  AlertTriangle, 
  Terminal, 
  Shield, 
  Link as LinkIcon,
  ArrowUpDown
} from 'lucide-react';
import AlertCenter from '../alerts/AlertCenter';
import SystemControls from './SystemControls';
import RiskManagement from './RiskManagement';
import ExchangeConnections from './ExchangeConnections';
import ElizaOSConsole from './ElizaOSConsole';
import ActiveTrades from './ActiveTrades';
import { 
  SystemControl, 
  SystemControlStatus, 
  RiskParameter, 
  ExchangeConnectionStatus, 
  ActiveTrade, 
  ElizaOSCommand,
  CommandCategory,
  ControlPanelState
} from './types';

// Generate mock data for demonstration
const generateMockData = (): ControlPanelState => {
  return {
    systemControls: [
      {
        id: '1',
        name: 'Auto-Trading',
        description: 'Enable automated trading across all strategies',
        status: SystemControlStatus.ENABLED,
        icon: 'zap'
      },
      {
        id: '2',
        name: 'ElizaOS Integration',
        description: 'Enable AI-powered trading assistance and analysis',
        status: SystemControlStatus.ENABLED,
        icon: 'brain'
      },
      {
        id: '3',
        name: 'Risk Manager',
        description: 'Automatically control risk exposure and position sizing',
        status: SystemControlStatus.ENABLED,
        icon: 'shield-check'
      },
      {
        id: '4',
        name: 'System Monitoring',
        description: 'Monitor system resources and performance',
        status: SystemControlStatus.ENABLED,
        icon: 'activity'
      },
      {
        id: '5',
        name: 'Emergency Stop',
        description: 'Close all positions and halt trading in case of emergency',
        status: SystemControlStatus.DISABLED,
        icon: 'alert-triangle'
      },
      {
        id: '6',
        name: 'Market Analysis',
        description: 'Automated market analysis and pattern detection',
        status: SystemControlStatus.ENABLED,
        requiresElizaOS: true,
        icon: 'brain'
      },
      {
        id: '7',
        name: 'Blockchain Monitoring',
        description: 'Monitor on-chain activity for trading signals',
        status: SystemControlStatus.PENDING,
        icon: 'hard-drive'
      }
    ],
    
    riskParameters: [
      {
        id: 'max_drawdown',
        name: 'Maximum Drawdown Limit',
        value: 10,
        min: 1,
        max: 50,
        step: 0.5,
        description: 'Maximum allowed drawdown before emergency stop',
        type: 'percentage'
      },
      {
        id: 'position_size',
        name: 'Position Size',
        value: 5,
        min: 1,
        max: 100,
        step: 1,
        description: 'Percentage of available capital per position',
        type: 'percentage'
      },
      {
        id: 'stop_loss',
        name: 'Default Stop Loss',
        value: 2.5,
        min: 0.5,
        max: 10,
        step: 0.1,
        description: 'Default stop loss percentage for new positions',
        type: 'percentage'
      },
      {
        id: 'trailing_stop',
        name: 'Use Trailing Stop',
        value: true,
        description: 'Enable trailing stop loss for all positions',
        type: 'toggle'
      },
      {
        id: 'stop_type',
        name: 'Stop Loss Type',
        value: 'Dynamic',
        options: ['Fixed', 'Dynamic', 'Volatility-Based'],
        description: 'Method used to calculate stop loss levels',
        type: 'select'
      },
      {
        id: 'max_open_positions',
        name: 'Maximum Open Positions',
        value: 15,
        min: 1,
        max: 50,
        step: 1,
        description: 'Maximum number of concurrent open positions',
        type: 'number'
      }
    ],
    
    exchangeConnections: [
      {
        id: '1',
        name: 'Binance',
        status: 'connected',
        lastConnected: new Date().toISOString(),
        tradingEnabled: true,
        api: {
          publicEndpoint: true,
          privateEndpoint: true,
          websocket: true
        }
      },
      {
        id: '2',
        name: 'Kraken',
        status: 'error',
        lastConnected: new Date(Date.now() - 15 * 60000).toISOString(),
        errorMessage: 'API key expired. Please update credentials.',
        tradingEnabled: false,
        api: {
          publicEndpoint: true,
          privateEndpoint: false,
          websocket: false
        }
      },
      {
        id: '3',
        name: 'Coinbase Pro',
        status: 'connected',
        lastConnected: new Date().toISOString(),
        tradingEnabled: true,
        api: {
          publicEndpoint: true,
          privateEndpoint: true,
          websocket: true
        }
      }
    ],
    
    activeTrades: [
      {
        id: '1',
        strategy: 'Momentum Breakout',
        symbol: 'BTC/USDT',
        type: 'long',
        entryPrice: 62850.45,
        currentPrice: 63120.80,
        quantity: 0.15,
        pnl: 40.55,
        pnlPercentage: 0.43,
        openTime: new Date(Date.now() - 3 * 3600000).toISOString(),
        stopLoss: 61500.00,
        takeProfit: 65000.00,
        exchange: 'Binance',
        status: 'open',
        risk: 'medium'
      },
      {
        id: '2',
        strategy: 'Elliott Wave',
        symbol: 'ETH/USDT',
        type: 'short',
        entryPrice: 3450.25,
        currentPrice: 3380.50,
        quantity: 1.25,
        pnl: 87.19,
        pnlPercentage: 2.02,
        openTime: new Date(Date.now() - 8 * 3600000).toISOString(),
        stopLoss: 3525.00,
        exchange: 'Binance',
        status: 'open',
        risk: 'low'
      },
      {
        id: '3',
        strategy: 'RSI Divergence',
        symbol: 'SOL/USDT',
        type: 'long',
        entryPrice: 148.75,
        currentPrice: 142.30,
        quantity: 10,
        pnl: -64.50,
        pnlPercentage: -4.34,
        openTime: new Date(Date.now() - 12 * 3600000).toISOString(),
        stopLoss: 140.00,
        takeProfit: 160.00,
        exchange: 'Coinbase Pro',
        status: 'open',
        risk: 'high'
      }
    ],
    
    elizaOSCommands: [
      {
        id: '1',
        command: 'analyze market sentiment for BTC/USDT',
        timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
        response: 'Market sentiment for BTC/USDT is currently positive (score: 78/100). On-chain metrics show accumulation by long-term holders, while short-term moving averages have crossed above long-term averages. Funding rates on futures markets are positive but not overheated, suggesting room for further upside. Consider maintaining long positions with trailing stops.',
        status: 'complete',
        isAI: true
      },
      {
        id: '2',
        command: 'optimize momentum strategy for ETH/USDT',
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
        response: 'Optimization complete. Based on the last 30 days of market data, I recommend the following parameter adjustments to improve strategy performance:\n\n- RSI period: 14 → 10\n- MA fast period: 9 → 7\n- MA slow period: 21 → 25\n- Profit target: 2.5% → 3.2%\n- Stop loss: 1.5% → 1.8%\n\nThese changes would have improved win rate from 62% to 71% and overall profit by 18.5% in the backtesting period.',
        status: 'complete',
        isAI: true
      }
    ],
    
    elizaOSEnabled: true
  };
};

const commandCategories: CommandCategory[] = [
  {
    id: 'system',
    name: 'System Commands',
    description: 'Control and monitor trading system status',
    commands: [
      'system status',
      'restart system',
      'check database',
      'show logs',
      'show errors'
    ],
    examples: [
      'system status',
      'show error logs for the last 24 hours'
    ]
  },
  {
    id: 'market',
    name: 'Market Analysis',
    description: 'Analyze market conditions and asset performance',
    commands: [
      'analyze market sentiment for [symbol]',
      'correlation analysis for [symbols]',
      'volatility report for [symbol]',
      'support resistance levels for [symbol]',
      'volume profile for [symbol]'
    ],
    examples: [
      'analyze market sentiment for BTC/USDT',
      'correlation analysis for BTC, ETH, SOL'
    ]
  },
  {
    id: 'strategies',
    name: 'Strategy Optimization',
    description: 'Optimize and manage trading strategies',
    commands: [
      'optimize [strategy] for [symbol]',
      'backtest [strategy] on [symbol]',
      'explain [strategy] logic',
      'compare strategy performance',
      'suggest parameter improvements'
    ],
    examples: [
      'optimize momentum strategy for ETH/USDT',
      'backtest RSI strategy on SOL/USDT from May to June'
    ]
  },
  {
    id: 'forecast',
    name: 'Market Forecasting',
    description: 'Predict future market movements',
    commands: [
      'forecast [symbol] for [timeframe]',
      'predict trend direction for [symbol]',
      'identify potential breakouts',
      'volatility forecast for [symbol]',
      'generate price targets for [symbol]'
    ],
    examples: [
      'forecast BTC/USDT for next 24 hours',
      'identify potential breakouts across top 10 crypto assets'
    ]
  },
  {
    id: 'risk',
    name: 'Risk Management',
    description: 'Manage and adjust risk parameters',
    commands: [
      'adjust risk parameters',
      'calculate optimal position size',
      'analyze portfolio risk',
      'suggest stop loss levels for [symbol]',
      'portfolio correlation heatmap'
    ],
    examples: [
      'analyze portfolio risk exposure',
      'suggest stop loss levels for BTC/USDT based on volatility'
    ]
  }
];

const MasterControlPanel: React.FC = () => {
  const [panelData, setPanelData] = useState<ControlPanelState>(generateMockData());
  const [activeTab, setActiveTab] = useState('system');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Handle system control toggle
  const handleToggleSystemControl = (controlId: string, enabled: boolean) => {
    setPanelData(prev => ({
      ...prev,
      systemControls: prev.systemControls.map(control => 
        control.id === controlId 
          ? { 
              ...control, 
              status: enabled ? SystemControlStatus.ENABLED : SystemControlStatus.DISABLED 
            } 
          : control
      )
    }));

    // Special case for ElizaOS toggle
    if (controlId === '2') { // ElizaOS control
      setPanelData(prev => ({
        ...prev,
        elizaOSEnabled: enabled,
        // Also disable any features that require ElizaOS
        systemControls: prev.systemControls.map(control => 
          control.requiresElizaOS && !enabled
            ? { ...control, status: SystemControlStatus.DISABLED }
            : control
        )
      }));
    }
  };

  // Handle risk parameter change
  const handleRiskParameterChange = (parameterId: string, value: number | string | boolean) => {
    setPanelData(prev => ({
      ...prev,
      riskParameters: prev.riskParameters.map(param => 
        param.id === parameterId 
          ? { ...param, value } 
          : param
      )
    }));
  };

  // Handle exchange connection actions
  const handleToggleTrading = (exchangeId: string, enabled: boolean) => {
    setPanelData(prev => ({
      ...prev,
      exchangeConnections: prev.exchangeConnections.map(conn => 
        conn.id === exchangeId 
          ? { ...conn, tradingEnabled: enabled } 
          : conn
      )
    }));
  };

  const handleReconnectExchange = (exchangeId: string) => {
    setPanelData(prev => ({
      ...prev,
      exchangeConnections: prev.exchangeConnections.map(conn => 
        conn.id === exchangeId 
          ? { 
              ...conn, 
              status: 'reconnecting',
              errorMessage: undefined
            } 
          : conn
      )
    }));

    // Simulate reconnection after 2 seconds
    setTimeout(() => {
      setPanelData(prev => ({
        ...prev,
        exchangeConnections: prev.exchangeConnections.map(conn => 
          conn.id === exchangeId 
            ? { 
                ...conn, 
                status: 'connected',
                lastConnected: new Date().toISOString()
              } 
            : conn
        )
      }));
    }, 2000);
  };

  // Handle ElizaOS command submission
  const handleSubmitCommand = (command: string) => {
    const newCommand: ElizaOSCommand = {
      id: Date.now().toString(),
      command,
      timestamp: new Date().toISOString(),
      status: 'pending',
      isAI: true
    };

    setPanelData(prev => ({
      ...prev,
      elizaOSCommands: [newCommand, ...prev.elizaOSCommands]
    }));

    // Simulate AI response after 1-3 seconds
    setTimeout(() => {
      setPanelData(prev => ({
        ...prev,
        elizaOSCommands: prev.elizaOSCommands.map(cmd => 
          cmd.id === newCommand.id 
            ? { 
                ...cmd, 
                status: 'complete',
                response: generateMockResponse(command)
              } 
            : cmd
        )
      }));
    }, 1000 + Math.random() * 2000);
  };

  // Generate a mock response for ElizaOS command
  const generateMockResponse = (command: string): string => {
    const commandLower = command.toLowerCase();
    
    if (commandLower.includes('market sentiment') || commandLower.includes('analyze')) {
      return 'Based on my analysis of social media sentiment, exchange order books, and on-chain metrics, the current market sentiment for this asset is moderately bullish (score: 72/100). There's a positive trend in social volume and funding rates are neutral, suggesting a balanced market without excessive leverage. Key resistance levels are at $64,500 and $66,800, with support at $61,200 and $59,800.';
    } else if (commandLower.includes('optimize') || commandLower.includes('strategy')) {
      return 'I've analyzed your strategy performance across different market conditions and identified several optimization opportunities:\n\n1. Entry timing can be improved by adding a volume confirmation filter\n2. Current stop loss placement is too tight for the asset's volatility profile\n3. Take profit levels could be adjusted to capture more upside\n\nI recommend adjusting the RSI threshold from 30 to 25 for entries and implementing a trailing stop that activates after 1.5% profit is reached. These changes would have improved your win rate by approximately 15% based on historical data.';
    } else if (commandLower.includes('forecast') || commandLower.includes('predict')) {
      return 'Based on current market conditions, technical patterns, and on-chain data, my forecast for the next 24 hours shows a 65% probability of continued upward movement with a target range of $63,200-$65,800. Volume profile indicates strong support at the $62,400 level. Key events to monitor that could impact this prediction: FOMC minutes release tomorrow and significant whale wallet movements detected in the last 4 hours.';
    } else if (commandLower.includes('system status') || commandLower.includes('status')) {
      return 'System Status Report:\n• CPU Usage: 42% (Normal)\n• Memory: 3.8GB/8GB (Normal)\n• Database: Operational, last backup 2 hours ago\n• Exchange Connections: 2/3 active (Kraken disconnected)\n• Active Strategies: 7 running, 1 paused\n• Open Positions: 3 (2 profitable, 1 at loss)\n• Risk Utilization: 28% of maximum\n\nNo critical issues detected. System performance is within normal parameters.';
    } else {
      return 'I\'ve processed your request and analyzed the relevant data. The analysis shows mixed signals with a slight bullish bias. Would you like me to provide more specific details or perform a deeper analysis on any particular aspect?';
    }
  };

  // Handle active trade actions
  const handleViewTrade = (tradeId: string) => {
    console.log(`View trade details for ${tradeId}`);
  };

  const handleCloseTrade = (tradeId: string) => {
    setPanelData(prev => ({
      ...prev,
      activeTrades: prev.activeTrades.filter(trade => trade.id !== tradeId)
    }));
  };

  const handlePauseTrade = (tradeId: string) => {
    // Implementation would pause the associated strategy
    console.log(`Pause strategy for trade ${tradeId}`);
  };

  const handleEditTrade = (tradeId: string) => {
    // Implementation would open edit dialog for trade parameters
    console.log(`Edit trade ${tradeId}`);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar Navigation */}
      <div className={`border-r transition-all ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
        <div className="p-4 flex items-center justify-between border-b">
          <h2 className={`font-bold text-lg ${sidebarCollapsed ? 'hidden' : 'block'}`}>
            Control Panel
          </h2>
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            {sidebarCollapsed ? <PanelRight className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </Button>
        </div>
        
        <div className="py-4">
          <TabsList className={`flex flex-col w-full rounded-none bg-transparent ${sidebarCollapsed ? 'items-center' : ''}`}>
            <TabsTrigger 
              value="system" 
              onClick={() => setActiveTab('system')}
              className={`justify-start py-2 mb-1 w-full ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-4'
              } ${activeTab === 'system' ? 'bg-muted' : ''}`}
            >
              <Zap className="h-5 w-5 mr-2" />
              {!sidebarCollapsed && <span>System Controls</span>}
            </TabsTrigger>
            
            <TabsTrigger 
              value="risk" 
              onClick={() => setActiveTab('risk')}
              className={`justify-start py-2 mb-1 w-full ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-4'
              } ${activeTab === 'risk' ? 'bg-muted' : ''}`}
            >
              <Shield className="h-5 w-5 mr-2" />
              {!sidebarCollapsed && <span>Risk Management</span>}
            </TabsTrigger>
            
            <TabsTrigger 
              value="exchanges" 
              onClick={() => setActiveTab('exchanges')}
              className={`justify-start py-2 mb-1 w-full ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-4'
              } ${activeTab === 'exchanges' ? 'bg-muted' : ''}`}
            >
              <LinkIcon className="h-5 w-5 mr-2" />
              {!sidebarCollapsed && <span>Exchange Connections</span>}
            </TabsTrigger>
            
            <TabsTrigger 
              value="elizaos" 
              onClick={() => setActiveTab('elizaos')}
              className={`justify-start py-2 mb-1 w-full ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-4'
              } ${activeTab === 'elizaos' ? 'bg-muted' : ''}`}
            >
              <Brain className="h-5 w-5 mr-2" />
              {!sidebarCollapsed && <span>ElizaOS Console</span>}
            </TabsTrigger>
            
            <TabsTrigger 
              value="trades" 
              onClick={() => setActiveTab('trades')}
              className={`justify-start py-2 mb-1 w-full ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-4'
              } ${activeTab === 'trades' ? 'bg-muted' : ''}`}
            >
              <ArrowUpDown className="h-5 w-5 mr-2" />
              {!sidebarCollapsed && <span>Active Trades</span>}
            </TabsTrigger>
          </TabsList>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with Alert Center */}
        <div className="border-b flex items-center justify-between py-2 px-4">
          <h1 className="text-xl font-bold">
            {activeTab === 'system' && 'System Controls'}
            {activeTab === 'risk' && 'Risk Management'}
            {activeTab === 'exchanges' && 'Exchange Connections'}
            {activeTab === 'elizaos' && 'ElizaOS AI Console'}
            {activeTab === 'trades' && 'Active Trades'}
          </h1>
          
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              <Layout className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            
            <AlertCenter />
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4">
          <Tabs value={activeTab} className="h-full">
            <TabsContent value="system" className="mt-0 h-full">
              <SystemControls 
                controls={panelData.systemControls}
                onToggle={handleToggleSystemControl}
                elizaOSEnabled={panelData.elizaOSEnabled}
              />
            </TabsContent>
            
            <TabsContent value="risk" className="mt-0 h-full">
              <RiskManagement 
                parameters={panelData.riskParameters}
                onParameterChange={handleRiskParameterChange}
              />
            </TabsContent>
            
            <TabsContent value="exchanges" className="mt-0 h-full">
              <ExchangeConnections 
                connections={panelData.exchangeConnections}
                onToggleTrading={handleToggleTrading}
                onReconnect={handleReconnectExchange}
                onSettings={(id) => console.log(`Open settings for exchange ${id}`)}
              />
            </TabsContent>
            
            <TabsContent value="elizaos" className="mt-0 h-full">
              <ElizaOSConsole 
                commands={panelData.elizaOSCommands}
                commandHistory={panelData.elizaOSCommands}
                isElizaEnabled={panelData.elizaOSEnabled}
                categories={commandCategories}
                onSubmitCommand={handleSubmitCommand}
                onClearConsole={() => {
                  setPanelData(prev => ({
                    ...prev,
                    elizaOSCommands: []
                  }));
                }}
              />
            </TabsContent>
            
            <TabsContent value="trades" className="mt-0 h-full">
              <ActiveTrades 
                trades={panelData.activeTrades}
                onViewDetails={handleViewTrade}
                onCloseTrade={handleCloseTrade}
                onPauseTrade={handlePauseTrade}
                onEditTrade={handleEditTrade}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MasterControlPanel;
