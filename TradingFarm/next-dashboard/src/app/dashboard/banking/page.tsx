"use client"

import { useState } from 'react'
import { 
  Wallet, 
  BarChart2, 
  ArrowRight, 
  ArrowLeft,
  CreditCard,
  DollarSign,
  PieChart,
  Landmark
} from 'lucide-react'
import MetaMaskConnector from '@/components/wallet/metamask-connector'
import ElizaChatInterface from '@/components/eliza/eliza-chat-interface'

interface FundAccount {
  id: string
  name: string
  balance: string
  symbol: string
  change: string
  isPositive: boolean
}

export default function BankingPage() {
  const [activeTab, setActiveTab] = useState('wallets')
  
  // Mock data for fund accounts
  const fundAccounts: FundAccount[] = [
    {
      id: 'eth-main',
      name: 'ETH Main Trading',
      balance: '4.28',
      symbol: 'ETH',
      change: '2.3%',
      isPositive: true
    },
    {
      id: 'btc-main',
      name: 'BTC Trading',
      balance: '0.125',
      symbol: 'BTC',
      change: '1.1%',
      isPositive: true
    },
    {
      id: 'sol-fund',
      name: 'SOL Fund',
      balance: '45.23',
      symbol: 'SOL',
      change: '0.7%',
      isPositive: false
    },
    {
      id: 'usdt-reserve',
      name: 'USDT Reserve',
      balance: '2,500.00',
      symbol: 'USDT',
      change: '0.0%',
      isPositive: true
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Banking & Wallet</h1>
        <p className="text-muted-foreground">
          Manage your wallets, fund allocations, and trading accounts
        </p>
      </div>

      {/* Banking Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('wallets')}
          className={`px-4 py-2 flex items-center ${
            activeTab === 'wallets'
              ? 'border-b-2 border-primary text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Wallet className="mr-2 h-4 w-4" />
          Wallets
        </button>
        <button
          onClick={() => setActiveTab('funds')}
          className={`px-4 py-2 flex items-center ${
            activeTab === 'funds'
              ? 'border-b-2 border-primary text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Trading Funds
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 flex items-center ${
            activeTab === 'analytics'
              ? 'border-b-2 border-primary text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart2 className="mr-2 h-4 w-4" />
          Analytics
        </button>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Section - Wallets & Funding */}
        <div className="md:col-span-2 space-y-6">
          {activeTab === 'wallets' && (
            <>
              <div className="dashboard-card">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <Landmark className="mr-2 h-5 w-5" />
                  Trading Farm Accounts
                </h2>
                <div className="space-y-4">
                  {fundAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/30">
                      <div className="flex items-center">
                        <div className="bg-primary/10 p-2 rounded-full mr-3">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-sm text-muted-foreground">Trading Account</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{account.balance} {account.symbol}</p>
                        <p className={`text-sm ${account.isPositive ? 'text-success' : 'text-danger'} flex items-center justify-end`}>
                          {account.isPositive ? <ArrowRight className="h-3 w-3 mr-1" /> : <ArrowLeft className="h-3 w-3 mr-1" />}
                          {account.change}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add the MetaMask connector component */}
              <MetaMaskConnector />
            </>
          )}

          {activeTab === 'funds' && (
            <div className="dashboard-card">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <PieChart className="mr-2 h-5 w-5" />
                Fund Allocation
              </h2>
              <div className="text-center p-12 text-muted-foreground">
                <p>Fund allocation view will be implemented here</p>
                <p className="text-sm mt-2">This section will allow users to manage how funds are allocated across different trading strategies and assets</p>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="dashboard-card">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <BarChart2 className="mr-2 h-5 w-5" />
                Banking Analytics
              </h2>
              <div className="text-center p-12 text-muted-foreground">
                <p>Banking analytics will be implemented here</p>
                <p className="text-sm mt-2">This section will display historical performance, ROI metrics, and transaction history</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Section - ElizaOS Chat Interface */}
        <div className="md:col-span-1">
          <ElizaChatInterface />
        </div>
      </div>
    </div>
  )
}
