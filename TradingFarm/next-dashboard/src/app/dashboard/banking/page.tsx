"use client"

import { useState, useEffect } from 'react'
import { 
  Wallet, 
  BarChart2, 
  ArrowRight, 
  ArrowLeft,
  CreditCard,
  DollarSign,
  PieChart,
  Landmark,
  Send,
  Clock,
  Download,
  Upload,
  RefreshCw,
  Coins
} from 'lucide-react'
import MetaMaskConnector from '@/components/wallet/metamask-connector'
import TransactionHistory from '@/components/wallet/transaction-history'
import { FarmFunding } from '@/components/farm/farm-funding'
import { ElizaChatInterface } from '@/components/eliza/eliza-chat-interface'
import { WalletConnectButton } from '@/components/wallet/wallet-connect-button'
import { WalletDetails } from '@/components/wallet/wallet-details'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Separator } from '@/components/ui/separator'
import { useAccount } from 'wagmi'
import { TradingWebDashboard } from '@/components/web3/trading-web-dashboard'
import { Web3KnowledgeProvider } from '@/components/web3/web3-knowledge-connector'

interface FundAccount {
  id: string
  name: string
  balance: string
  symbol: string
  change: string
  isPositive: boolean
}

interface AssetAllocation {
  name: string
  allocation: number
  color: string
}

interface Strategy {
  id: string
  name: string
  allocation: number
  maxAllocation: number
  description: string
  risk: 'Low' | 'Medium' | 'High'
  performance: string
  isActive: boolean
}

export default function BankingPage() {
  const [activeTab, setActiveTab] = useState('wallets')
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { isConnected, address: accountAddress } = useAccount()
  const chain = { id: 1 }; // Replace with actual chain data
  
  const [allocations] = useState<AssetAllocation[]>([
    { name: 'BTC', allocation: 35, color: '#F7931A' },
    { name: 'ETH', allocation: 25, color: '#627EEA' },
    { name: 'SOL', allocation: 15, color: '#00FFA3' },
    { name: 'USDT', allocation: 15, color: '#26A17B' },
    { name: 'Other', allocation: 10, color: '#8A92B2' }
  ])
  
  // Mock data for fund accounts
  const fundAccounts: FundAccount[] = [
    { 
      id: 'acct1', 
      name: 'Main Trading', 
      balance: '2.45', 
      symbol: 'ETH', 
      change: '+5.2%', 
      isPositive: true 
    },
    { 
      id: 'acct2', 
      name: 'Staking Reserve', 
      balance: '8.78', 
      symbol: 'ETH', 
      change: '+1.8%', 
      isPositive: true 
    },
    { 
      id: 'acct3', 
      name: 'Research Fund', 
      balance: '1.32', 
      symbol: 'ETH', 
      change: '-0.5%', 
      isPositive: false 
    },
  ]

  // Mock data for strategies
  const strategies: Strategy[] = [
    {
      id: 'strat1',
      name: 'Bitcoin Trend Follower',
      allocation: 25,
      maxAllocation: 30,
      description: 'Follows BTC price trends with dynamic entry/exit signals',
      risk: 'Medium',
      performance: '+12.5%',
      isActive: true
    },
    {
      id: 'strat2',
      name: 'ETH-BTC Pairs',
      allocation: 18,
      maxAllocation: 25,
      description: 'Arbitrage between ETH and BTC price movements',
      risk: 'Low',
      performance: '+8.3%',
      isActive: true
    },
    {
      id: 'strat3',
      name: 'DeFi Yield Optimizer',
      allocation: 15,
      maxAllocation: 20,
      description: 'Optimizes yield across DeFi protocols dynamically',
      risk: 'High',
      performance: '+18.7%',
      isActive: false
    },
  ]

  // Force refresh to update components
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Banking</h2>
          <p className="text-muted-foreground">
            Manage your funds, wallets, and banking connections
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 lg:mt-0">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="wallets" className="gap-1.5">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Wallets</span>
          </TabsTrigger>
          <TabsTrigger value="funds" className="gap-1.5">
            <Landmark className="h-4 w-4" />
            <span className="hidden sm:inline">Funds</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="web3" className="gap-1.5">
            <Coins className="h-4 w-4" />
            <span className="hidden sm:inline">Web3</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Wallets Tab */}
        <TabsContent value="wallets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-4">
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Wallet className="mr-2 h-5 w-5" />
                    Wallet Connection
                  </CardTitle>
                  <CardDescription>
                    Connect to manage your assets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <WalletConnectButton className="w-full" />
                  <Separator />
                  <WalletDetails />
                </CardContent>
              </Card>
              
              {isConnected && (
                <Card className="border shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PieChart className="mr-2 h-5 w-5" />
                      Asset Allocation
                    </CardTitle>
                    <CardDescription>
                      Distribution of your assets
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="space-y-3">
                      {allocations.map((asset) => (
                        <div key={asset.name} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: asset.color }}
                            />
                            <span>{asset.name}</span>
                          </div>
                          <span className="font-medium">{asset.allocation}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div className="md:col-span-2">
              <FarmFunding />
            </div>
          </div>
        </TabsContent>
        
        {/* Funds Tab */}
        <TabsContent value="funds" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {fundAccounts.map((account) => (
              <Card key={account.id} className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle>{account.name}</CardTitle>
                  <CardDescription>
                    Trading account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-muted-foreground">Balance</p>
                      <p className="text-2xl font-bold">{account.balance} {account.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">24h Change</p>
                      <p className={`text-sm font-semibold ${account.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {account.change}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between gap-2 pt-0">
                  <Button variant="outline" size="sm" className="w-1/2 gap-1">
                    <Upload className="h-3.5 w-3.5" />
                    Withdraw
                  </Button>
                  <Button size="sm" className="w-1/2 gap-1">
                    <Download className="h-3.5 w-3.5" />
                    Deposit
                  </Button>
                </CardFooter>
              </Card>
            ))}
            
            {/* Create New Fund Card */}
            <Card className="border border-dashed bg-muted/30 flex flex-col items-center justify-center p-6 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="rounded-full bg-background p-4 mb-4">
                <Send className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">Create New Fund</h3>
              <p className="text-sm text-muted-foreground text-center mb-2">
                Set up a new fund for a specific purpose
              </p>
              <Button variant="outline" size="sm">
                Add Fund
              </Button>
            </Card>
          </div>
          
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart2 className="mr-2 h-5 w-5" />
                Strategy Allocation
              </CardTitle>
              <CardDescription>
                How your funds are allocated to strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {strategies.map((strategy) => (
                  <div key={strategy.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center">
                          <h4 className="font-medium">{strategy.name}</h4>
                          {!strategy.isActive && (
                            <span className="ml-2 rounded-full px-2 py-0.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                              Paused
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{strategy.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${strategy.performance.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {strategy.performance}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-muted">
                            {strategy.risk}
                          </span>
                        </div>
                        <p className="text-sm">
                          {strategy.allocation}% / {strategy.maxAllocation}% max
                        </p>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary"
                        style={{ width: `${(strategy.allocation / strategy.maxAllocation) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Transaction History
                </CardTitle>
                <CardDescription>
                  Recent transactions and activities
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Search..." 
                  className="w-[200px]" 
                />
                <Button variant="outline" size="sm">
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Recent Transactions</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setRefreshTrigger(prev => prev + 1)}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  Refresh
                </Button>
              </div>
              <TransactionHistory 
                refreshTrigger={refreshTrigger} 
                walletAddress={accountAddress || '0x0'}
                chainId={chain?.id?.toString() || '1'}
                provider={typeof window !== 'undefined' ? window.ethereum : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Web3 Tab */}
        <TabsContent value="web3" className="space-y-4">
          <Web3KnowledgeProvider>
            <div className="container mx-auto">
              <TradingWebDashboard />
            </div>
          </Web3KnowledgeProvider>
        </TabsContent>
      </Tabs>
      
      {/* Eliza Chat Interface */}
      <div className="fixed bottom-4 right-4 z-10">
        <ElizaChatInterface 
          initialMessages={[
            {
              id: 'welcome',
              content: 'Welcome to the Trading Farm banking interface. How can I assist you with your financial operations today?',
              type: 'ai',
              timestamp: new Date()
            }
          ]}
          quickCommands={[
            {
              id: 'balance',
              label: 'Check Balance',
              command: 'What is my current balance?',
              icon: <Wallet className="h-3.5 w-3.5" />,
              description: 'Check current account balance'
            },
            {
              id: 'transactions',
              label: 'Recent Transactions',
              command: 'Show my recent transactions',
              icon: <Clock className="h-3.5 w-3.5" />,
              description: 'View recent transaction history'
            },
            {
              id: 'transfer',
              label: 'Transfer Funds',
              command: 'I want to transfer funds',
              icon: <Send className="h-3.5 w-3.5" />,
              description: 'Transfer funds between accounts'
            }
          ]}
        />
      </div>
    </div>
  )
}
