"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button"
import { WalletDetails } from "@/components/wallet/wallet-details"
import { AgentWalletDashboard } from "@/components/wallet/agent-wallet-dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Agent } from "@/components/agents/agent-details"
import { Wallet, BarChart, ArrowRight, History } from "lucide-react"

// Mock data for demonstration
const mockAgents: Agent[] = [
  {
    id: "agent-1",
    name: "Trend Trader",
    type: "trend",
    status: "active",
    market: "BTC/USDT",
    performance: 8.5,
    lastActive: new Date().toISOString(),
    description: "A trend-following strategy that analyzes market momentum",
    settings: {
      riskLevel: "medium",
      maxPositionSize: 10,
      maxDrawdown: 5,
      tradeInterval: "daily",
      useAutoRisk: true,
      preferredMarkets: ["BTC/USDT", "ETH/USDT"]
    },
    instructions: [],
    walletAddress: "0x3eF44F19c95bc049E2394f8BD778F62bAd8C8b13",
    balance: 0.25,
    transactions: [
      {
        id: "tx-1",
        type: "deposit",
        amount: 0.25,
        timestamp: new Date().toISOString(),
        txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        status: "completed"
      }
    ],
    assignedFarms: ["farm-1"]
  },
  {
    id: "agent-2",
    name: "Reversal Hunter",
    type: "reversal",
    status: "active",
    market: "ETH/USDT",
    performance: -2.3,
    lastActive: new Date().toISOString(),
    description: "Identifies potential market reversals and trades counter-trend",
    settings: {
      riskLevel: "high",
      maxPositionSize: 15,
      maxDrawdown: 10,
      tradeInterval: "hourly",
      useAutoRisk: false,
      preferredMarkets: ["ETH/USDT", "SOL/USDT"]
    },
    instructions: [],
    walletAddress: "0x4f5A127b69f87E784c6cdD874C5A27c307292D85",
    balance: 0.15,
    transactions: [
      {
        id: "tx-2",
        type: "deposit",
        amount: 0.15,
        timestamp: new Date().toISOString(),
        txHash: "0x2345678901abcdef2345678901abcdef2345678901abcdef2345678901abcdef",
        status: "completed"
      }
    ],
    assignedFarms: ["farm-2"]
  },
  {
    id: "agent-3",
    name: "Arbitrage Bot",
    type: "arbitrage",
    status: "paused",
    market: "SOL/USDT",
    performance: 12.7,
    lastActive: new Date(Date.now() - 86400000).toISOString(),
    description: "Exploits price differences between exchanges",
    settings: {
      riskLevel: "low",
      maxPositionSize: 5,
      maxDrawdown: 2,
      tradeInterval: "hourly",
      useAutoRisk: true,
      preferredMarkets: ["SOL/USDT", "AVAX/USDT"]
    },
    instructions: [],
    walletAddress: "0x6a8B3a5CFeB2dEf92a09dc375CEa05BD30f3c5cD",
    balance: 0.08,
    transactions: [
      {
        id: "tx-3",
        type: "deposit",
        amount: 0.1,
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        txHash: "0x3456789012abcdef3456789012abcdef3456789012abcdef3456789012abcdef",
        status: "completed"
      },
      {
        id: "tx-4",
        type: "withdraw",
        amount: 0.02,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        txHash: "0x4567890123abcdef4567890123abcdef4567890123abcdef4567890123abcdef",
        status: "completed"
      }
    ],
    assignedFarms: ["farm-1", "farm-3"]
  },
  {
    id: "agent-4",
    name: "DCA Investor",
    type: "custom",
    status: "offline",
    market: "ETH/USDT",
    performance: 3.2,
    lastActive: new Date(Date.now() - 86400000 * 5).toISOString(),
    description: "Dollar-cost averaging strategy that buys at regular intervals",
    settings: {
      riskLevel: "low",
      maxPositionSize: 5,
      maxDrawdown: 3,
      tradeInterval: "weekly",
      useAutoRisk: false,
      preferredMarkets: ["ETH/USDT", "BTC/USDT"]
    },
    instructions: [],
    walletAddress: "0x7D9b4C8bA9F8e78aB46cc09DaBEF31B84868Ad3E",
    balance: 0.05,
    transactions: [
      {
        id: "tx-5",
        type: "deposit",
        amount: 0.05,
        timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
        txHash: "0x5678901234abcdef5678901234abcdef5678901234abcdef5678901234abcdef",
        status: "completed"
      }
    ],
    assignedFarms: ["farm-2"]
  }
];

export default function BankingPage() {
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState("wallet")
  const [agents, setAgents] = useState<Agent[]>(mockAgents)
  
  // Handle agent funding
  const handleAgentFunded = (agent: Agent, amount: string, txHash: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id === agent.id) {
        // Create a new transaction
        const newTransaction = {
          id: `tx-${Date.now()}`,
          type: 'deposit' as const,
          amount: parseFloat(amount),
          timestamp: new Date().toISOString(),
          txHash,
          status: 'completed' as const
        }
        
        // Update agent balance and add transaction
        return {
          ...a,
          balance: a.balance + parseFloat(amount),
          transactions: [newTransaction, ...a.transactions]
        }
      }
      return a
    }))
  }
  
  return (
    <div className="container py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Banking</h1>
          {!isConnected && (
            <WalletConnectButton />
          )}
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="wallet" className="gap-2">
              <Wallet className="h-4 w-4" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-2">
              <BarChart className="h-4 w-4" />
              Agent Funding
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Transaction History
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="wallet" className="space-y-6">
            {isConnected ? (
              <WalletDetails />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">Connect Your Wallet</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    Connect your MetaMask wallet to view your balance, fund agents, and track transaction history.
                  </p>
                  <WalletConnectButton />
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="agents" className="space-y-6">
            {isConnected ? (
              <AgentWalletDashboard 
                agents={agents}
                onAgentFunded={handleAgentFunded}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <BarChart className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">Connect to Fund Agents</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    Connect your wallet to fund your trading agents and monitor their performance.
                  </p>
                  <WalletConnectButton />
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="history" className="space-y-6">
            {isConnected ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Transaction history would go here */}
                  <div className="py-4 text-center text-muted-foreground">
                    Transaction history will be displayed here once you have performed transactions.
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <History className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">View Transaction History</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    Connect your wallet to view your past transactions and agent funding history.
                  </p>
                  <WalletConnectButton />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
