"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { OpenWebUI } from './open-web-ui'
import { getNetworkName, createExplorerLink } from '@/utils/web3-utils'
import { Wallet, ArrowUpRight, ArrowDownRight, BarChart2, ExternalLink, Send, Coins, RefreshCw, Shield } from 'lucide-react'

// Import for ElizaOS integration with Web3 knowledge
import { Web3ElizaChat, useWeb3Knowledge } from '@/components/web3/web3-knowledge-connector'

// Creating mock hooks to use until the actual wagmi hooks are properly set up
const useAccount = () => {
  return {
    isConnected: false,
    address: "0x0000000000000000000000000000000000000000" as `0x${string}`
  }
}

const useNetwork = () => {
  return {
    chain: {
      id: 1,
      name: "Ethereum Mainnet",
      nativeCurrency: {
        name: "Ether",
        symbol: "ETH",
        decimals: 18
      }
    }
  }
}

interface TradingWebDashboardProps {
  showElizaChat?: boolean
  className?: string
}

export function TradingWebDashboard({
  showElizaChat = true,
  className = ''
}: TradingWebDashboardProps) {
  const { isConnected, address } = useAccount()
  const { chain } = useNetwork()
  const [activeTab, setActiveTab] = useState<string>('overview')
  
  // Mock data for quick demonstration - in production would be fetched from API
  const [vaultData, setVaultData] = useState({
    totalFunds: '24.56 ETH',
    activeStrategies: 3,
    pendingTransactions: 2,
    riskScore: 'Medium',
    lastUpdated: new Date().toISOString(),
    recentTransactions: [
      { id: 'tx1', type: 'Deposit', amount: '2.5 ETH', timestamp: '2025-03-20T15:32:15Z', status: 'Completed' },
      { id: 'tx2', type: 'Strategy Allocation', amount: '5.0 ETH', timestamp: '2025-03-19T12:15:22Z', status: 'Completed' },
      { id: 'tx3', type: 'Withdrawal', amount: '1.2 ETH', timestamp: '2025-03-18T08:45:10Z', status: 'Pending' }
    ]
  })
  
  // Periodically refresh data (simulate)
  useEffect(() => {
    const interval = setInterval(() => {
      setVaultData(prev => ({
        ...prev,
        lastUpdated: new Date().toISOString()
      }))
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])
  
  // Quick commands for ElizaOS integration
  const elizaQuickCommands = [
    {
      id: 'vault-status',
      label: 'Vault Status',
      command: 'What is the current status of my vault?',
      icon: <Shield className="h-3.5 w-3.5" />,
      description: 'Check vault security status'
    },
    {
      id: 'strategy-performance',
      label: 'Performance',
      command: 'Show me strategy performance metrics',
      icon: <BarChart2 className="h-3.5 w-3.5" />,
      description: 'View strategy performance data'
    },
    {
      id: 'new-transaction',
      label: 'New Transfer',
      command: 'I want to create a new transfer',
      icon: <Send className="h-3.5 w-3.5" />,
      description: 'Initialize a new transfer'
    }
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trading Web Dashboard</h2>
          <p className="text-muted-foreground">
            Manage your web3 trading activities and vault integrations
          </p>
        </div>
        
        <OpenWebUI variant="default" showNetworkSelector showBalances />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vault">Vault</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Managed Funds
                </CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vaultData.totalFunds}</div>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(vaultData.lastUpdated).toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Strategies
                </CardTitle>
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vaultData.activeStrategies}</div>
                <div className="flex items-center pt-1">
                  <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs text-green-500">+2% Today</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Transactions
                </CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vaultData.pendingTransactions}</div>
                <p className="text-xs text-muted-foreground">
                  {vaultData.pendingTransactions === 0 ? 'All transactions completed' : 'Pending execution'}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Chain Status</CardTitle>
                <CardDescription>Current blockchain connection</CardDescription>
              </CardHeader>
              <CardContent>
                {isConnected && chain ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Connected to</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                          Active
                        </Badge>
                        <span className="font-medium">{chain.name}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Chain ID</span>
                      <span className="font-medium">{chain.id}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Currency</span>
                      <span className="font-medium">{chain.nativeCurrency.symbol}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Connected Address</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                        <a 
                          href={chain ? createExplorerLink('address', address || '', chain.id) : '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">No wallet connected</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2" 
                      onClick={() => window.document.getElementById('w3m-button')?.click()}
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      Connect Wallet
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest transactions and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vaultData.recentTransactions.map((tx, index) => (
                    <div key={tx.id} className="flex items-start gap-3">
                      <div 
                        className={`h-8 w-8 rounded-full flex items-center justify-center
                          ${tx.type === 'Deposit' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                            tx.type === 'Withdrawal' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}
                      >
                        {tx.type === 'Deposit' ? (
                          <ArrowDownRight className="h-4 w-4" />
                        ) : tx.type === 'Withdrawal' ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-sm">{tx.type}</p>
                          <Badge variant={tx.status === 'Completed' ? 'outline' : 'secondary'}>
                            {tx.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{tx.amount}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(tx.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full gap-1">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh Transactions
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="vault">
          <Card>
            <CardHeader>
              <CardTitle>Vault Management</CardTitle>
              <CardDescription>Manage your vault and trading strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Funds</p>
                    <p className="text-xl font-medium">{vaultData.totalFunds}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Risk Profile</p>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={
                          vaultData.riskScore === 'Low' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' :
                          vaultData.riskScore === 'Medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                          'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                        }
                      >
                        {vaultData.riskScore}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <p className="text-sm font-medium">Strategy Allocation</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm">BTC Momentum Strategy</p>
                      <p className="text-sm font-medium">35%</p>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: '35%' }} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm">ETH-BTC Correlation</p>
                      <p className="text-sm font-medium">25%</p>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: '25%' }} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm">Stable Yield Farm</p>
                      <p className="text-sm font-medium">40%</p>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: '40%' }} />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="pt-2">
                  <Button variant="outline" className="w-full">Manage Strategies</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>View and manage your transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {/* In a real implementation, this would be a paginated list of transactions */}
              <div className="py-8 text-center">
                <p className="text-muted-foreground">Transaction history integration coming soon</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use ElizaOS commands to query transaction data
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* ElizaOS Chat Integration */}
      {showElizaChat && (
        <div className="fixed bottom-4 right-4 z-10">
          <Web3ElizaChat />
        </div>
      )}
    </div>
  )
}
