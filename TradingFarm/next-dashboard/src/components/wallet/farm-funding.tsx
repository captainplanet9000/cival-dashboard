"use client"

import { useState, useEffect } from 'react'
import { Send, RefreshCw, AlertCircle, Wallet, DollarSign, ArrowRight, PlusCircle, Landmark } from 'lucide-react'

interface Farm {
  id: string
  name: string
  description: string
  balance: string
  symbol: string
  status: 'active' | 'paused' | 'stopped'
}

interface FarmFundingProps {
  walletAddress: string
  chainId: string
  provider: any
  walletBalance: string
  symbol: string
  onFundSuccess?: () => void
}

export default function FarmFunding({
  walletAddress,
  chainId,
  provider,
  walletBalance,
  symbol,
  onFundSuccess
}: FarmFundingProps) {
  const [farms, setFarms] = useState<Farm[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [showFundDialog, setShowFundDialog] = useState(false)
  const [fundAmount, setFundAmount] = useState('')
  const [transactionStatus, setTransactionStatus] = useState('')
  const [estimatedGas, setEstimatedGas] = useState('')

  // Load farms when component mounts
  useEffect(() => {
    if (walletAddress && chainId) {
      fetchFarms()
    }
  }, [walletAddress, chainId])

  // Fetch available farms
  const fetchFarms = async () => {
    setIsLoading(true)
    
    try {
      // In a real app, fetch farms from your backend API
      // For demo purposes, we'll use mock data
      const mockFarms: Farm[] = [
        {
          id: 'farm-1',
          name: 'ETH Primary Farm',
          description: 'Main trading farm for ETH pairs',
          balance: '3.5',
          symbol: 'ETH',
          status: 'active'
        },
        {
          id: 'farm-2',
          name: 'DeFi Strategy Farm',
          description: 'Specialized in DeFi token trading',
          balance: '1.2',
          symbol: 'ETH',
          status: 'active'
        },
        {
          id: 'farm-3',
          name: 'Conservative Farm',
          description: 'Low-risk trading strategies',
          balance: '2.8',
          symbol: 'ETH',
          status: 'active'
        },
        {
          id: 'farm-4',
          name: 'High Yield Farm',
          description: 'Aggressive trading for higher returns',
          balance: '0.75',
          symbol: 'ETH',
          status: 'paused'
        }
      ]
      
      setFarms(mockFarms)
    } catch (error) {
      console.error("Error fetching farms:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Open fund dialog for a specific farm
  const openFundDialog = (farm: Farm) => {
    setSelectedFarm(farm)
    setShowFundDialog(true)
    setFundAmount('')
    setTransactionStatus('')
    
    // In a real app, estimate gas cost
    setEstimatedGas('~0.001 ETH')
  }

  // Handle fund amount change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '' || /^\d*\.?\d*$/.test(value)) { // Only allow numbers and decimal point
      setFundAmount(value)
    }
  }

  // Set maximum amount from wallet
  const setMaxAmount = () => {
    // In a real app, subtract gas cost from max amount
    const maxAmount = parseFloat(walletBalance) - 0.001 // Subtract estimated gas
    setFundAmount(maxAmount > 0 ? maxAmount.toString() : '0')
  }

  // Fund the farm
  const fundFarm = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFarm || !fundAmount || parseFloat(fundAmount) <= 0) {
      return
    }

    try {
      setTransactionStatus('sending')
      
      // In a real app, call your farm funding smart contract
      
      // Simulating transaction for demonstration
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      if (Math.random() > 0.1) { // 90% success rate for demo
        setTransactionStatus('success')
        
        // Update farm balance (in a real app, this would be fetched from the contract)
        setFarms(prev => prev.map(farm => 
          farm.id === selectedFarm.id
            ? { ...farm, balance: (parseFloat(farm.balance) + parseFloat(fundAmount)).toString() }
            : farm
        ))
        
        // Notify parent component
        if (onFundSuccess) {
          onFundSuccess()
        }
        
        // Close dialog after success
        setTimeout(() => {
          setShowFundDialog(false)
          setTransactionStatus('')
        }, 2000)
      } else {
        // Simulate random failure
        setTransactionStatus('error')
      }
      
    } catch (error) {
      console.error("Error funding farm:", error)
      setTransactionStatus('error')
    }
  }

  // Check if wallet has sufficient funds
  const hasSufficientFunds = () => {
    if (!fundAmount) return false
    return parseFloat(fundAmount) <= parseFloat(walletBalance)
  }

  return (
    <div className="farm-funding">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center">
          <Landmark className="mr-2 h-5 w-5" />
          Trading Farms
        </h2>
        <button 
          className="btn-ghost p-2 rounded-full"
          onClick={fetchFarms}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : farms.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No trading farms found</p>
          <button className="btn-primary mt-4 flex items-center mx-auto">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Farm
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {farms.map(farm => (
            <div key={farm.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium flex items-center">
                    {farm.name}
                    <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs
                      ${farm.status === 'active' ? 'bg-success/10 text-success' : 
                        farm.status === 'paused' ? 'bg-warning/10 text-warning' : 
                        'bg-danger/10 text-danger'}`}>
                      {farm.status.charAt(0).toUpperCase() + farm.status.slice(1)}
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{farm.description}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold">{farm.balance} {farm.symbol}</div>
                  <div className="text-xs text-muted-foreground">Current Balance</div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <div className="flex space-x-2">
                  <button className="btn-secondary text-xs py-1 px-3">View</button>
                  <button 
                    className="btn-ghost text-xs py-1 px-3"
                    disabled={farm.status !== 'active'}
                  >
                    Strategies
                  </button>
                </div>
                <button 
                  className="btn-primary text-xs py-1 px-3 flex items-center"
                  onClick={() => openFundDialog(farm)}
                  disabled={farm.status !== 'active'}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Fund
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fund Dialog */}
      {showFundDialog && selectedFarm && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Fund Trading Farm</h3>
            
            {transactionStatus === 'success' ? (
              <div className="flex flex-col items-center justify-center p-4">
                <div className="bg-success/10 p-3 rounded-full mb-3">
                  <ArrowRight className="h-6 w-6 text-success" />
                </div>
                <p className="font-medium mb-1">Transaction Successful</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {fundAmount} {symbol} has been sent to {selectedFarm.name}
                </p>
              </div>
            ) : (
              <form onSubmit={fundFarm}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Farm Name</label>
                  <div className="p-3 bg-muted/50 rounded-md flex items-center">
                    <Landmark className="h-5 w-5 mr-2 text-primary" />
                    <span>{selectedFarm.name}</span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Current Farm Balance</label>
                  <div className="p-3 bg-muted/50 rounded-md">
                    {selectedFarm.balance} {selectedFarm.symbol}
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <label className="block text-sm font-medium">Amount ({symbol})</label>
                    <div className="text-sm text-muted-foreground flex items-center">
                      <Wallet className="h-3 w-3 mr-1" />
                      Balance: {walletBalance} {symbol}
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={fundAmount}
                      onChange={handleAmountChange}
                      placeholder="0.0"
                      className="form-input pr-16"
                      required
                    />
                    <button
                      type="button"
                      onClick={setMaxAmount}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                    >
                      MAX
                    </button>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      Gas Fee: {estimatedGas}
                    </span>
                    {!hasSufficientFunds() && fundAmount && (
                      <span className="text-xs text-danger">
                        Insufficient funds
                      </span>
                    )}
                  </div>
                </div>
                
                {transactionStatus === 'error' && (
                  <div className="mb-4 p-2 bg-danger/10 border border-danger/20 rounded-md flex items-center text-danger text-sm">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Transaction failed. Please try again.
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowFundDialog(false)}
                    className="btn-ghost"
                    disabled={transactionStatus === 'sending'}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex items-center"
                    disabled={
                      transactionStatus === 'sending' || 
                      !fundAmount || 
                      parseFloat(fundAmount) <= 0 ||
                      !hasSufficientFunds()
                    }
                  >
                    {transactionStatus === 'sending' ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Funds
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
