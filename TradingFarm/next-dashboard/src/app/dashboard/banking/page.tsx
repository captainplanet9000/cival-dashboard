"use client"

import * as React from 'react'
import { 
  Wallet, 
  BarChart2, 
  ArrowRight, 
  ArrowLeft,
  CreditCard,
  DollarSign,
  PieChart,
  Landmark,
  Shield,
  Clock,
  RefreshCw
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createBrowserClient } from '@/utils/supabase/client'
import { useToast } from '@/components/ui/use-toast'

import MetaMaskConnector from '@/components/wallet/metamask-connector'
import ElizaChatInterface from '@/components/eliza/eliza-chat-interface'
import BalancesPanel from '@/components/banking/BalancesPanel'
import FundingModal from '@/components/banking/FundingModal'
import TransactionsPanel from '@/components/banking/TransactionsPanel'
import FundAllocationsPanel from '@/components/banking/FundAllocationsPanel'
import VaultInfoPanel from '@/components/banking/VaultInfoPanel'

export default function BankingPage() {
  const [activeTab, setActiveTab] = React.useState('wallets')
  const [userId, setUserId] = React.useState<string>('1')
  const [farmId, setFarmId] = React.useState<string | undefined>(undefined)
  const [showFundingModal, setShowFundingModal] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [assetFilter, setAssetFilter] = React.useState<string | null>(null)
  const supabase = createBrowserClient()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  
  React.useEffect(() => {
    // Check if we have an asset filter from URL
    const asset = searchParams.get('asset')
    if (asset) {
      setAssetFilter(asset)
      setActiveTab('transactions')
    }
    
    // Get the current user and their farms
    async function getUserData() {
      setLoading(true)
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
          
          // Get user's farms
          const { data: farms, error } = await supabase
            .from('farms')
            .select('id, name')
            .eq('user_id', user.id)
          
          if (error) {
            console.error('Error fetching farms:', error)
          } else if (farms && farms.length > 0) {
            setFarmId(farms[0].id)
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    getUserData()
  }, [supabase, searchParams])
  
  const handleShowTransactions = (asset: string) => {
    setAssetFilter(asset)
    setActiveTab('transactions')
  }
  
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banking & Wallet</h1>
          <p className="text-muted-foreground">
            Manage your wallets, fund allocations, and trading accounts
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Banking Tabs */}
      <div className="flex flex-wrap border-b border-border">
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
          Fund Allocation
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 flex items-center ${
            activeTab === 'transactions'
              ? 'border-b-2 border-primary text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="mr-2 h-4 w-4" />
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          className={`px-4 py-2 flex items-center ${
            activeTab === 'vault'
              ? 'border-b-2 border-primary text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="mr-2 h-4 w-4" />
          Vault
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
              <BalancesPanel 
                userId={userId} 
                onShowTransactions={handleShowTransactions}
                farmId={farmId}
              />
              <MetaMaskConnector />
            </>
          )}

          {activeTab === 'funds' && (
            <FundAllocationsPanel userId={userId} />
          )}
          
          {activeTab === 'transactions' && (
            <TransactionsPanel 
              userId={userId} 
              assetFilter={assetFilter || undefined}
              limit={50}
            />
          )}
          
          {activeTab === 'vault' && (
            <VaultInfoPanel userId={userId} />
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
      
      {/* Funding Modal (triggered from BalancesPanel but could be opened from a button here too) */}
      {showFundingModal && (
        <FundingModal
          isOpen={showFundingModal}
          onClose={() => setShowFundingModal(false)}
          onSuccess={() => {
            setShowFundingModal(false)
            // Refresh balances
          }}
          userId={userId}
          farmId={farmId}
        />
      )}
    </div>
  )
}
