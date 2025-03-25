"use client"

import React, { ReactNode, useState, useEffect } from "react"
import { 
  Home, 
  LineChart, 
  Gift, 
  BarChart2, 
  Settings, 
  Menu, 
  X,
  Wallet,
  Sun,
  Moon,
  Database,
  Bot,
  Target,
  MessageSquare,
  TrendingUp,
  AlertCircle
} from "lucide-react"
import { ElizaProvider } from "@/context/eliza-context"
import { AIAgentV2Provider } from "@/context/ai-agent-v2-context"
import ElizaConsoleContainer from "@/components/elizaos/eliza-console-container"
import { Agent } from "@/components/agents/agent-details"
import { AgentInstruction } from "@/components/agents/agent-intelligence"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Mock initial agent data (in a real app, this would come from an API)
const initialAgentData: Agent[] = [
  {
    id: 'agent-123',
    name: 'TrendMaster',
    status: 'active',
    type: 'trend',
    performance: 8.5,
    trades: 147,
    winRate: 63,
    createdAt: '2023-05-15',
    specialization: ['Bitcoin', 'Ethereum', 'Large Caps'],
    description: 'Trend following agent that specializes in major cryptocurrencies',
    level: 'advanced',
    walletAddress: '0x1234...5678',
    balance: 1250.75,
    transactions: [
      { id: 'tx1', timestamp: '2023-05-16T10:30:00Z', amount: 500, type: 'deposit', txHash: '0x78a1...3f5d', status: 'completed' },
      { id: 'tx2', timestamp: '2023-06-01T14:45:00Z', amount: 750, type: 'deposit', txHash: '0x92c4...7e8a', status: 'completed' }
    ],
    detailedPerformance: {
      daily: 0.8,
      weekly: 2.3,
      monthly: 8.5,
      allTime: 12.7,
      trades: {
        won: 93,
        lost: 54,
        total: 147
      },
      profitFactor: 1.75,
      avgDuration: '4h 26m'
    },
    settings: {
      riskLevel: 'medium',
      maxDrawdown: 15,
      positionSizing: 10,
      tradesPerDay: 5,
      automationLevel: 'full',
      timeframes: ['1h', '4h', 'Daily'],
      indicators: ['RSI', 'Moving Averages', 'Volume']
    },
    instructions: [
      {
        id: 'instr-1',
        content: 'Focus on uptrend confirmation with volume analysis',
        createdAt: '2023-05-15T10:30:00Z',
        enabled: true,
        category: 'market',
        impact: 'high'
      },
      {
        id: 'instr-2',
        content: 'Increase position size when volatility decreases',
        createdAt: '2023-06-01T14:45:00Z',
        enabled: true,
        category: 'risk',
        impact: 'medium'
      }
    ]
  },
  {
    id: 'agent-456',
    name: 'SwingTrader',
    status: 'active',
    type: 'reversal',
    performance: 12.3,
    trades: 96,
    winRate: 58,
    createdAt: '2023-06-22',
    specialization: ['DeFi', 'Mid Caps'],
    description: 'Reversal pattern detection for swing trading opportunities',
    level: 'advanced',
    walletAddress: '0xabcd...ef12',
    balance: 2340.50,
    transactions: [
      { id: 'tx3', timestamp: '2023-06-22T09:15:00Z', amount: 1000, type: 'deposit', txHash: '0xab45...9d2e', status: 'completed' },
      { id: 'tx4', timestamp: '2023-07-15T14:45:00Z', amount: 1200, type: 'deposit', txHash: '0xc7d8...6f3b', status: 'completed' },
      { id: 'tx5', timestamp: '2023-08-01T10:30:00Z', amount: -500, type: 'withdraw', txHash: '0xd1e9...4a5c', status: 'completed' }
    ],
    detailedPerformance: {
      daily: 1.2,
      weekly: 3.7,
      monthly: 12.3,
      allTime: 16.5,
      trades: {
        won: 56,
        lost: 40,
        total: 96
      },
      profitFactor: 1.62,
      avgDuration: '12h 45m'
    },
    settings: {
      riskLevel: 'high',
      maxDrawdown: 20,
      positionSizing: 15,
      tradesPerDay: 2,
      automationLevel: 'full',
      timeframes: ['4h', 'Daily', 'Weekly'],
      indicators: ['Stochastic', 'MACD', 'Bollinger Bands']
    },
    instructions: [
      {
        id: 'instr-3',
        content: 'Look for oversold conditions on daily timeframe',
        createdAt: '2023-06-22T09:15:00Z',
        enabled: true,
        category: 'timing',
        impact: 'high'
      }
    ]
  },
  {
    id: 'agent-789',
    name: 'StableCoin Arbitrageur',
    status: 'paused',
    type: 'arbitrage',
    performance: 3.2,
    trades: 412,
    winRate: 91,
    createdAt: '2023-04-10',
    specialization: ['Stablecoins', 'DEX', 'CEX'],
    description: 'Stablecoin arbitrage between exchanges',
    level: 'basic',
    walletAddress: '0x9876...4321',
    balance: 5000.00,
    transactions: [
      { id: 'tx6', timestamp: '2023-04-10T11:00:00Z', amount: 2000, type: 'deposit', txHash: '0xe2f3...2d7b', status: 'completed' },
      { id: 'tx7', timestamp: '2023-05-05T14:45:00Z', amount: 3000, type: 'deposit', txHash: '0xf4a2...1c8d', status: 'completed' },
      { id: 'tx8', timestamp: '2023-06-10T10:30:00Z', amount: -1000, type: 'withdraw', txHash: '0xa1b2...3e4f', status: 'completed' },
      { id: 'tx9', timestamp: '2023-07-01T09:15:00Z', amount: 1000, type: 'deposit', txHash: '0xb2c3...5d6e', status: 'completed' }
    ],
    detailedPerformance: {
      daily: 0.2,
      weekly: 1.1,
      monthly: 3.2,
      allTime: 7.8,
      trades: {
        won: 375,
        lost: 37,
        total: 412
      },
      profitFactor: 2.31,
      avgDuration: '0h 15m'
    },
    settings: {
      riskLevel: 'low',
      maxDrawdown: 5,
      positionSizing: 25,
      tradesPerDay: 15,
      automationLevel: 'full',
      timeframes: ['1m', '5m', '15m'],
      indicators: ['Price Divergence', 'Liquidity', 'Fees']
    },
    instructions: [
      {
        id: 'instr-4',
        content: 'Only execute when spread exceeds gas costs by 200%',
        createdAt: '2023-04-10T11:00:00Z',
        enabled: true,
        category: 'strategy',
        impact: 'high'
      },
      {
        id: 'instr-5',
        content: 'Focus on USDC-USDT pairs across top 5 exchanges',
        createdAt: '2023-04-15T16:30:00Z',
        enabled: true,
        category: 'market',
        impact: 'medium'
      }
    ]
  }
]

// Navigation items for both top and side navigation
const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Command', href: '/dashboard/command', icon: MessageSquare },
  { name: 'Brain', href: '/dashboard/brain', icon: TrendingUp },
  { name: 'Farms', href: '/dashboard/farm-management', icon: Database },
  { name: 'Agents', href: '/dashboard/agents', icon: Bot },
  { name: 'Goals', href: '/dashboard/goals', icon: Target },
  { name: 'Treasury', href: '/dashboard/banking', icon: Wallet },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [agents, setAgents] = useState<Agent[]>(initialAgentData);
  const [activePath, setActivePath] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Set active path on mount - with safe client-side initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setActivePath(window.location.pathname);
      // Force loading to complete
      setIsLoaded(true);
    }
  }, []);

  // Force initialization after a short delay to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoaded && typeof window !== 'undefined') {
        console.log("Force loading dashboard after timeout");
        setIsLoaded(true);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [isLoaded]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    
    // Toggle dark mode class on document element
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  const handleAgentChange = (updatedAgents: Agent[]) => {
    setAgents(updatedAgents)
  }

  // Check if a path is active
  const isActive = (path: string) => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      return currentPath === path || currentPath.startsWith(`${path}/`);
    }
    return false;
  };

  // If there's an error, render a basic error UI
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Dashboard Error</AlertTitle>
          <AlertDescription>
            {error.message || "Failed to initialize dashboard. Please try refreshing the page."}
          </AlertDescription>
        </Alert>
        <div className="rounded-md border p-4">
          <h1 className="text-2xl font-bold mb-4">Dashboard Layout Error</h1>
          <p className="mb-4">There was an error loading the dashboard. You can try the following:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Refresh the page</li>
            <li>Check your browser console for errors</li>
            <li>Verify network connectivity</li>
          </ul>
          <div className="flex space-x-4 mt-6">
            <button 
              onClick={() => window.location.reload()} 
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md"
            >
              Refresh Page
            </button>
            <a 
              href="/dashboard/debug" 
              className="border border-border px-4 py-2 rounded-md"
            >
              Go to Debug Page
            </a>
          </div>
        </div>
      </div>
    );
  }

  // If not loaded yet, show a simple loading state with debug info
  if (!isLoaded) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <div className="text-center">
          <LineChart className="h-10 w-10 animate-pulse mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-bold">Loading Trading Farm Dashboard...</h1>
          {/* Add a forced reload button in case of getting stuck */}
          <button
            onClick={() => {
              console.log("Force loading the dashboard");
              setIsLoaded(true);
            }}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
          >
            Force Dashboard Load
          </button>
          
          {/* Debug information */}
          <div className="mt-8 text-left bg-background/80 p-4 rounded-md max-w-lg mx-auto">
            <h3 className="font-medium mb-2">Loading Debug Info:</h3>
            <pre className="text-xs overflow-auto max-h-40 bg-muted p-2 rounded">
              No debug information available
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard layout
  return (
    <div className="flex h-screen">
      {/* Wrap the entire dashboard in error boundaries */}
      <ErrorBoundaryWrapper>
        <AIAgentV2Provider>
          <ElizaProvider>
            {/* Mobile Navigation Toggle */}
            <label htmlFor="sidebar-toggle" className="fixed bottom-4 right-4 z-50 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-lg md:hidden">
              <Menu className="block h-6 w-6 md:hidden" />
            </label>

            {/* Hidden toggle for mobile navigation */}
            <input type="checkbox" id="sidebar-toggle" className="hidden" />

            {/* Main Container */}
            <div className="flex h-full w-full flex-1 overflow-hidden" data-component-name="DashboardLayout">
              {/* Sidebar Navigation */}
              <div className="fixed inset-y-0 z-20 -translate-x-full border-r border-border bg-background p-6 shadow-lg transition-transform md:static md:translate-x-0">
                <div className="flex h-full flex-col justify-between">
                  <div className="space-y-8">
                    {/* Logo and Brand */}
                    <div className="flex items-center space-x-2">
                      <div className="rounded-md bg-primary p-2 text-primary-foreground">
                        <LineChart className="h-6 w-6" />
                      </div>
                      <span className="text-xl font-bold">Trading Farm</span>
                    </div>

                    {/* Mobile Close Button */}
                    <label htmlFor="sidebar-toggle" className="absolute right-4 top-4 block cursor-pointer md:hidden">
                      <X className="h-6 w-6" />
                    </label>

                    {/* Navigation Links */}
                    <nav className="space-y-1">
                      {navigationItems.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          className={`flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            isActive(item.href)
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <item.icon className={`h-5 w-5 ${isActive(item.href) ? 'text-primary' : ''}`} />
                          <span>{item.name}</span>
                        </a>
                      ))}
                    </nav>
                  </div>
                  {/* User Profile */}
                  <div className="rounded-md border border-border p-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">JD</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">John Doe</p>
                        <p className="text-xs text-muted-foreground">Trader</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Main Content */}
              <div className="flex-1 overflow-auto">
                {/* Top Navigation */}
                <div className="sticky top-0 z-10 border-b border-border bg-background px-6 py-4">
                  <div className="flex items-center justify-between">
                    {/* Page Title */}
                    <h1 className="text-lg font-semibold">Trading Farm Dashboard</h1>
                    
                    {/* Top Controls */}
                    <div className="flex items-center space-x-4">
                      {/* Theme Toggle */}
                      <button 
                        onClick={toggleTheme}
                        className="rounded-md p-2 hover:bg-muted"
                        aria-label="Toggle theme"
                      >
                        {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                      </button>
                      
                      {/* Notifications */}
                      <button 
                        className="rounded-md p-2 hover:bg-muted relative"
                        aria-label="View notifications"
                      >
                        <AlertCircle className="h-5 w-5" />
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                          3
                        </span>
                      </button>
                      
                      {/* User Menu */}
                      <div className="relative">
                        <button 
                          className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"
                          aria-label="User menu"
                        >
                          <span className="text-sm font-medium text-primary">JD</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Page Content */}
                <main className="p-6">
                  {children}
                </main>
              </div>

              {/* ElizaOS Console Container */}
              <ElizaConsoleContainer agents={agents} onAgentChange={handleAgentChange} />
            </div>
          </ElizaProvider>
        </AIAgentV2Provider>
      </ErrorBoundaryWrapper>
    </div>
  )
}

// Simple error boundary component
class ErrorBoundaryWrapper extends React.Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Dashboard error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Dashboard Error</AlertTitle>
            <AlertDescription>
              {this.state.error?.message || "An error occurred in the dashboard components."}
            </AlertDescription>
          </Alert>
          <div className="rounded-md border p-4">
            <h1 className="text-2xl font-bold mb-4">Component Error</h1>
            <p className="mb-4">There was an error in one of the dashboard components. You can try the following:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Refresh the page</li>
              <li>Check browser console for detailed errors</li>
              <li>Visit the debug page to test individual components</li>
            </ul>
            <div className="flex space-x-4 mt-6">
              <button 
                onClick={() => window.location.reload()} 
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md"
              >
                Refresh Page
              </button>
              <a 
                href="/dashboard/debug" 
                className="border border-border px-4 py-2 rounded-md"
              >
                Go to Debug Page
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
