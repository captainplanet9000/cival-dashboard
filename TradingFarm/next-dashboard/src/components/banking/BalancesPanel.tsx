"use client"

import { useState, useEffect } from 'react'
import { 
  RefreshCw,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus
} from 'lucide-react'
import { bankingService, Balance } from '@/services/banking-service'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import FundingModal from './FundingModal'

interface BalancesPanelProps {
  userId?: string
  onShowTransactions?: (asset: string) => void
  farmId?: string
}

export default function BalancesPanel({ userId = '1', onShowTransactions, farmId }: BalancesPanelProps) {
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
  const [showFundingModal, setShowFundingModal] = useState(false)
  const [sortBy, setSortBy] = useState<'value' | 'name' | 'change'>('value')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const { toast } = useToast()

  useEffect(() => {
    fetchBalances()
  }, [userId, farmId])

  const fetchBalances = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await bankingService.getBalances(userId)
      
      if (fetchError) {
        setError(fetchError)
        toast({
          title: "Error loading balances",
          description: fetchError,
          variant: "destructive",
        })
      } else if (data) {
        setBalances(data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load balances')
      toast({
        title: "Error",
        description: "Failed to load balances data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    toast({
      description: "Refreshing balances...",
    })
    fetchBalances()
  }

  const handleFund = (asset: string) => {
    setSelectedAsset(asset)
    setShowFundingModal(true)
  }

  const handleShowTransactions = (asset: string) => {
    if (onShowTransactions) {
      onShowTransactions(asset)
    }
  }

  const sortedBalances = [...balances].sort((a, b) => {
    if (sortBy === 'value') {
      return sortOrder === 'desc' ? b.valueUsd - a.valueUsd : a.valueUsd - b.valueUsd
    } else if (sortBy === 'name') {
      return sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)
    } else {
      return sortOrder === 'desc' ? b.change24h - a.change24h : a.change24h - b.change24h
    }
  })

  const handleSort = (column: 'value' | 'name' | 'change') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const totalValue = balances.reduce((sum, asset) => sum + asset.valueUsd, 0)

  // Render loading state
  if (loading) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Trading Assets</h2>
          <Button variant="ghost" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border border-border rounded-md mb-3">
            <div className="flex items-center">
              <Skeleton className="h-10 w-10 rounded-full mr-3" />
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <div className="text-right">
              <Skeleton className="h-5 w-24 mb-1 ml-auto" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Trading Assets</h2>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <div className="p-4 border border-destructive/30 bg-destructive/10 rounded-md text-destructive text-center">
          <p className="font-medium">Failed to load balance data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold">Trading Assets</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium mr-1">Total: ${totalValue.toLocaleString()}</span>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex justify-end mb-2">
        <div className="flex items-center text-xs space-x-4">
          <button 
            className={`flex items-center ${sortBy === 'name' ? 'text-primary font-medium' : 'text-muted-foreground'}`} 
            onClick={() => handleSort('name')}
          >
            Name {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />)}
          </button>
          <button 
            className={`flex items-center ${sortBy === 'value' ? 'text-primary font-medium' : 'text-muted-foreground'}`} 
            onClick={() => handleSort('value')}
          >
            Value {sortBy === 'value' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />)}
          </button>
          <button 
            className={`flex items-center ${sortBy === 'change' ? 'text-primary font-medium' : 'text-muted-foreground'}`} 
            onClick={() => handleSort('change')}
          >
            Change {sortBy === 'change' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />)}
          </button>
        </div>
      </div>

      {sortedBalances.length === 0 ? (
        <div className="p-4 border border-border bg-muted/30 rounded-md text-center">
          <p className="text-muted-foreground">No assets found</p>
          <Button className="mt-2" variant="outline" size="sm" onClick={() => setShowFundingModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Funds
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedBalances.map((asset) => {
            const percentage = totalValue > 0 ? (asset.valueUsd / totalValue) * 100 : 0
            return (
              <div key={asset.assetId} className="flex flex-col border border-border rounded-md hover:bg-muted/30">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-2 rounded-full mr-3">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{asset.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${asset.valueUsd.toLocaleString()}</p>
                    <p className={`text-xs flex items-center justify-end ${asset.change24h >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {asset.change24h >= 0 ? <ArrowRight className="h-3 w-3 mr-1" /> : <ArrowLeft className="h-3 w-3 mr-1" />}
                      {Math.abs(asset.change24h).toFixed(2)}%
                    </p>
                  </div>
                </div>
                
                <div className="px-3 pb-3 pt-1">
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="text-muted-foreground">Balance: {asset.balance.toLocaleString()} {asset.symbol}</span>
                    <span className="text-muted-foreground">{percentage.toFixed(1)}% of portfolio</span>
                  </div>
                  <Progress value={percentage} className="h-1" />
                  
                  <div className="flex justify-between mt-3">
                    <button 
                      className="text-xs text-primary hover:underline flex items-center"
                      onClick={() => handleShowTransactions(asset.assetId)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Transaction History
                    </button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-6 py-0 px-2 text-xs"
                      onClick={() => handleFund(asset.assetId)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Funds
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
          
          <Button className="w-full" variant="outline" onClick={() => setShowFundingModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Asset
          </Button>
        </div>
      )}

      {/* Funding Modal */}
      {showFundingModal && (
        <FundingModal
          isOpen={showFundingModal}
          onClose={() => setShowFundingModal(false)}
          selectedAsset={selectedAsset}
          onSuccess={() => {
            setShowFundingModal(false)
            fetchBalances()
          }}
          userId={userId}
          farmId={farmId}
        />
      )}
    </div>
  )
}
