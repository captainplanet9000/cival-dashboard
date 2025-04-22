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
  RefreshCw,
  History,
  Upload,
  Download
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createBrowserClient } from '@/utils/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Card } from '@/components/ui/card'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

import MetaMaskConnector from '@/components/wallet/metamask-connector'
import ElizaChatInterface from '@/components/eliza/eliza-chat-interface'
import BalancesPanel from '@/components/banking/BalancesPanel'
import FundingModal from '@/components/banking/FundingModal'
import TransactionsPanel from '@/components/banking/TransactionsPanel'
import VaultInfoPanel from '@/components/banking/VaultInfoPanel'
import FundAllocationsPanel from '@/components/banking/FundAllocationsPanel'

export default function BankingPage() {
  const [activeTab, setActiveTab] = React.useState('wallets')
  const [userId, setUserId] = React.useState<string>('1')
  const [farmId, setFarmId] = React.useState<string | undefined>(undefined)
  const [showFundingModal, setShowFundingModal] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [assetFilter, setAssetFilter] = React.useState<string | null>(null)
  const [showDepositDialog, setShowDepositDialog] = React.useState(false)
  const [showWithdrawDialog, setShowWithdrawDialog] = React.useState(false)
  const [selectedCurrency, setSelectedCurrency] = React.useState<string | undefined>()
  const [selectedTransaction, setSelectedTransaction] = React.useState<any | null>(null)
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

  const handleOpenDeposit = () => {
    setShowDepositDialog(true)
  }

  const handleOpenWithdraw = (currency?: string) => {
    setSelectedCurrency(currency)
    setShowWithdrawDialog(true)
  }

  const handleTransactionSelect = (transaction: any) => {
    setSelectedTransaction(transaction)
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
        <div className="flex gap-2">
          <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <Upload className="h-4 w-4" />
                Deposit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Deposit Funds</DialogTitle>
                <DialogDescription>
                  Add funds to your Trading Farm account
                </DialogDescription>
              </DialogHeader>
              <div className="p-12 flex justify-center">
                <p>Deposit functionality coming soon!</p>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-1">
                <Download className="h-4 w-4" />
                Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Withdraw Funds</DialogTitle>
                <DialogDescription>
                  Withdraw funds from your Trading Farm account
                </DialogDescription>
              </DialogHeader>
              <div className="p-12 flex justify-center">
                <p>Withdrawal functionality coming soon!</p>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
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
        <button
          onClick={() => setActiveTab('banking-interface')}
          className={`px-4 py-2 flex items-center ${
            activeTab === 'banking-interface'
              ? 'border-b-2 border-primary text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Landmark className="mr-2 h-4 w-4" />
          Advanced Banking
        </button>
      </div>

      {/* Tab Content */}
      {activeTab !== 'banking-interface' ? (
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
                  <BarChart2 className="mx-auto h-16 w-16 mb-4 opacity-20" />
                  <p>Detailed banking analytics coming soon!</p>
                  <Button variant="outline" className="mt-4">Enable Analytics</Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Section - Eliza Assistant */}
          <div>
            <ElizaChatInterface 
              initialContext={{
                module: 'banking',
                userId: userId,
                farmId: farmId || '0'
              }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* New Advanced Banking Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="dashboard-card">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Balance Overview
                </h2>
                <div className="text-center p-12 text-muted-foreground">
                  <DollarSign className="mx-auto h-16 w-16 mb-4 opacity-20" />
                  <p>Balance overview coming soon!</p>
                </div>
              </div>
            </div>
            <div>
              <Card className="h-full overflow-hidden">
                <ElizaChatInterface 
                  initialContext={{
                    module: 'banking',
                    userId: userId,
                    farmId: farmId || '0'
                  }}
                  className="h-full"
                  showTitle={true}
                  title="Banking Assistant"
                />
              </Card>
            </div>
          </div>
          
          <div className="pt-4">
            <div className="dashboard-card">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Transaction History
              </h2>
              <div className="text-center p-12 text-muted-foreground">
                <Clock className="mx-auto h-16 w-16 mb-4 opacity-20" />
                <p>Transaction history coming soon!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Funding Modal */}
      {showFundingModal && (
        <FundingModalWithWallet
          isOpen={showFundingModal}
          onClose={() => setShowFundingModal(false)}
          userId={userId}
          farmId={farmId}
        />
      )}
    </div>
  )
}
