'use client'

import React from 'react'
import { Metadata } from 'next';
import PageTitle from '@/components/layout/page-title';
import TradingTerminal from '@/components/trading/trading-terminal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, Wallet } from 'lucide-react';
import { 
  ArrowDownUp, 
  AreaChart, 
  Clock, 
  LineChart,
  Layers,
  Share2,
  RefreshCw,
  Bot,
  ChevronRight,
  Shield,
  ArrowDownUp as WalletIcon
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import OrderHistory from "@/components/trading/order-history"
import RecentTrades from "@/components/trading/recent-trades"
import MarketOverview from "@/components/trading/market-overview"
import OrderBook from "@/components/trading/order-book"
import { PositionsTable } from "@/components/trading/positions-table"
import { OrdersTable } from "@/components/trading/orders-table"
import TradingChart from "@/components/trading/trading-chart"
import { useTheme } from "next-themes"
import { useToast } from "@/components/ui/use-toast"
import axios from 'axios'
import { useMarketData } from "@/hooks/use-market-data"
import { getFarms } from "@/services/supabase/farm-service"
import { getAgents } from "@/services/supabase/agent-service"

// Define types for our component
interface ExchangeAccount {
  id: string;
  name: string;
  exchange: string;
}

interface TradingPair {
  symbol: string;
  name: string;
  price: string;
  change: string;
}

interface MarketData {
  price: number;
  volume: number;
  high: number;
  low: number;
}

interface LoadingState {
  pairs: boolean;
  orders: boolean;
  positions: boolean;
}

interface Farm {
  id: string;
  name: string;
  description?: string;
  status: string;
}

interface CustomAgent {
  id: string;
  name: string;
  specialty: string;
  status: string;
}

interface PositionsTableProps {
  agent?: string;
  refreshTrigger?: number;
}

interface OrdersTableProps {
  symbol: string;
  exchangeId: string;
  refreshTrigger: number;
}

interface OrderHistoryProps {
  refreshTrigger?: number;
  symbol?: string;
  onCancelOrder?: (orderId: string) => Promise<void>;
  loading?: boolean;
  showCancelButton?: boolean;
}

export const metadata: Metadata = {
  title: 'Trading Dashboard',
  description: 'Execute and monitor trades across multiple exchanges',
};

export default function TradingPage() {
  const { theme } = useTheme()
  const { toast } = useToast()
  const chartTheme = theme === "dark" ? "dark" : "light"
  
  const [selectedPair, setSelectedPair] = React.useState<string>("BTCUSDT")
  const [selectedTimeframe, setSelectedTimeframe] = React.useState<string>("1h")
  const [exchangeAccounts, setExchangeAccounts] = React.useState<ExchangeAccount[]>([])
  const [selectedExchange, setSelectedExchange] = React.useState<string>("")
  const [isLoading, setIsLoading] = React.useState<LoadingState>({
    pairs: false,
    orders: false,
    positions: false
  })
  const [refreshTrigger, setRefreshTrigger] = React.useState<number>(0)
  const [tradingPairs, setTradingPairs] = React.useState<TradingPair[]>([])
  const [farms, setFarms] = React.useState<Farm[]>([])
  const [selectedFarm, setSelectedFarm] = React.useState<string>("")
  const [agents, setAgents] = React.useState<CustomAgent[]>([])

  // Use the market data hook to get real-time price updates
  const { data: marketData, isLoading: isMarketDataLoading, error: marketDataError } = 
    useMarketData(selectedPair, selectedExchange)
  
  // Load exchange accounts on mount
  React.useEffect(() => {
    const loadExchangeAccounts = async () => {
      try {
        const response = await axios.get('/api/trading/exchange-accounts')
        setExchangeAccounts(response.data)
        
        if (response.data.length > 0) {
          setSelectedExchange(response.data[0].id)
        }
      } catch (error) {
        console.error('Failed to load exchange accounts:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load exchange accounts. Please try again.',
        })
      }
    }
    
    loadExchangeAccounts()
    loadFarmsAndAgents()
  }, [toast])

  // Load farms and agents
  const loadFarmsAndAgents = async () => {
    try {
      const farmData = await getFarms()
      setFarms(farmData as unknown as Farm[])
      if (farmData.length > 0) {
        setSelectedFarm(farmData[0].id)
      }

      const agentData = await getAgents()
      // Transform agent data to match our CustomAgent interface
      const customAgents = agentData.map(agent => ({
        id: agent.id,
        name: agent.name || 'Unnamed Agent',
        specialty: agent.type || 'General',
        status: agent.status || 'active'
      }))
      setAgents(customAgents)
    } catch (error) {
      console.error('Failed to load farms and agents:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load farm data. Please try again.',
      })
    }
  }
  
  // Load trading pairs when exchange changes
  React.useEffect(() => {
    if (selectedExchange) {
      loadTradingPairs(selectedExchange)
    }
  }, [selectedExchange])

  // Load trading pairs for selected exchange
  const loadTradingPairs = async (exchangeId: string) => {
    setIsLoading((prev: LoadingState) => ({ ...prev, pairs: true }))
    try {
      const response = await axios.get(`/api/trading/pairs?exchangeId=${exchangeId}`)
      
      // Format the trading pairs with real data
      const formattedPairs = response.data.map((pair: any) => ({
        symbol: pair.symbol,
        name: pair.display_name || pair.symbol,
        price: pair.last_price ? `$${parseFloat(pair.last_price).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 8
        })}` : 'Loading...',
        change: pair.price_change_24h ? `${pair.price_change_24h > 0 ? '+' : ''}${pair.price_change_24h.toFixed(2)}%` : '0.00%'
      }))
      
      setTradingPairs(formattedPairs)
      
      // Select first pair if nothing selected yet
      if (!selectedPair && formattedPairs.length > 0) {
        setSelectedPair(formattedPairs[0].symbol)
      }
    } catch (error) {
      console.error('Failed to load trading pairs:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load trading pairs. Please try again.',
      })
    } finally {
      setIsLoading((prev: LoadingState) => ({ ...prev, pairs: false }))
    }
  }
  
  // Handle order placement success
  const handleOrderPlaced = (order: any) => {
    toast({
      title: 'Order Placed',
      description: `${order.side.toUpperCase()} order for ${order.quantity} ${order.symbol} submitted successfully.`,
    })
    
    // Refresh orders and positions
    setRefreshTrigger((prev: number) => prev + 1)
  }
  
  // Handle refresh button click
  const handleRefresh = () => {
    setRefreshTrigger((prev: number) => prev + 1)
    
    toast({
      title: 'Refreshing Data',
      description: 'Updating trading data...',
    })
  }

  // Assign an agent to a trading task
  const assignAgentToTrading = async (agentId: string) => {
    try {
      // This would be a call to your agent service to assign the agent to the trading task
      toast({
        title: 'Agent Assigned',
        description: `Agent has been assigned to monitor and execute trades for ${selectedPair}`,
      })
    } catch (error) {
      console.error('Failed to assign agent:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to assign agent. Please try again.',
      })
    }
  }
  
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle
          title="Trading Dashboard"
          subtitle="Execute and monitor trades across multiple exchanges"
        />
        <Badge className="bg-green-600 hover:bg-green-700">
          ElizaOS Enabled
        </Badge>
      </div>

      <Separator />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <Tabs defaultValue="terminal" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="terminal" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trading Terminal
              </TabsTrigger>
              <TabsTrigger value="strategies" className="flex items-center gap-2">
                <WalletIcon className="h-4 w-4" />
                Strategies
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Market Insights
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                ElizaOS Integration
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="terminal" className="mt-4">
              <TradingTerminal />
            </TabsContent>
            
            <TabsContent value="strategies" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trading Strategies</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Trading strategies will be available in a future update.
                    Create and manage automated trading strategies with AI assistance.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="insights" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Market Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Market insights will be available in a future update.
                    Get AI-powered analysis of market trends and opportunities.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="ai" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>ElizaOS Integration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <h3 className="text-lg font-medium mb-2">AI-Powered Trading</h3>
                    <p className="text-sm text-muted-foreground">
                      ElizaOS integration enhances your trading experience with AI-powered insights and recommendations.
                      The system leverages advanced machine learning models to analyze market patterns and provide trading signals.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4">
                      <h4 className="text-md font-medium mb-1">Current Features</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                        <li>AI-powered trade recommendations</li>
                        <li>Real-time market analysis</li>
                        <li>One-click apply of AI suggestions</li>
                        <li>Confidence scoring for recommendations</li>
                      </ul>
                    </div>
                    
                    <div className="rounded-lg border p-4">
                      <h4 className="text-md font-medium mb-1">Coming Soon</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                        <li>Multi-agent coordination for advanced strategies</li>
                        <li>Natural language trading commands</li>
                        <li>Personalized risk profile integration</li>
                        <li>Autonomous trading execution</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// ElizaOS Integration Functions
function handleAnalyzeMarket(symbol: string) {
  console.log(`Analyzing market for ${symbol}...`);
  // In a real application, this would call the ElizaOS API to analyze the market
  return null;
}

function handleRiskAssessment() {
  console.log('Running risk assessment...');
  // In a real application, this would call the ElizaOS API to assess risk
  return null;
}

function handleOptimizeWallet() {
  console.log('Optimizing wallet allocation...');
  // In a real application, this would call the ElizaOS API to optimize wallet allocation
  return null;
}

function handleDeployAgent() {
  console.log('Deploying trading agent...');
  // In a real application, this would call the ElizaOS API to deploy a trading agent
  return null;
}
