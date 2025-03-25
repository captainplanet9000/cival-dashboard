"use client"

import { useState, useEffect } from 'react'
import { Download, Upload, Send, ExternalLink, RefreshCw, Clock, Filter } from 'lucide-react'

interface Transaction {
  id: string
  hash: string
  type: 'Deposit' | 'Withdraw' | 'Transfer' | 'Swap' | 'Contract Interaction'
  amount: string
  tokenSymbol: string
  date: string
  status: 'Pending' | 'Completed' | 'Failed'
  from: string
  to: string
  chainId: string
}

interface TransactionHistoryProps {
  walletAddress: string
  chainId: string
  provider: any
  maxItems?: number
  refreshTrigger?: number
}

export default function TransactionHistory({
  walletAddress,
  chainId,
  provider,
  maxItems = 5,
  refreshTrigger = 0
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<string | null>(null)

  // Load transactions when wallet address, chain, or refresh trigger changes
  useEffect(() => {
    if (walletAddress && chainId) {
      fetchTransactions()
    }
  }, [walletAddress, chainId, refreshTrigger])

  // Function to fetch transaction history
  const fetchTransactions = async () => {
    if (!walletAddress || !chainId || !provider) return

    setIsLoading(true)
    
    try {
      // In a production app, you would call a transaction history API
      // or use a service like Etherscan/Blockscout API
      
      // Simulated API response for demonstration
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          type: 'Deposit',
          amount: '0.5',
          tokenSymbol: 'ETH',
          date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          status: 'Completed',
          from: '0xabcdef1234567890abcdef1234567890abcdef12',
          to: walletAddress,
          chainId
        },
        {
          id: '2',
          hash: '0x2345678901abcdef2345678901abcdef2345678901abcdef2345678901abcdef',
          type: 'Transfer',
          amount: '0.2',
          tokenSymbol: 'ETH',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
          status: 'Completed',
          from: walletAddress,
          to: '0x7890abcdef1234567890abcdef1234567890abcd',
          chainId
        },
        {
          id: '3',
          hash: '0x3456789012abcdef3456789012abcdef3456789012abcdef3456789012abcdef',
          type: 'Swap',
          amount: '0.1',
          tokenSymbol: 'ETH → USDT',
          date: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
          status: 'Completed',
          from: walletAddress,
          to: '0xDEF1234567890ABCDEF1234567890ABCDEF123456',
          chainId
        },
        {
          id: '4',
          hash: '0x4567890123abcdef4567890123abcdef4567890123abcdef4567890123abcdef',
          type: 'Withdraw',
          amount: '100',
          tokenSymbol: 'USDT',
          date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
          status: 'Completed',
          from: '0x1234567890ABCDEF1234567890ABCDEF12345678',
          to: walletAddress,
          chainId
        },
        {
          id: '5',
          hash: '0x5678901234abcdef5678901234abcdef5678901234abcdef5678901234abcdef',
          type: 'Contract Interaction',
          amount: '0',
          tokenSymbol: 'ETH',
          date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
          status: 'Completed',
          from: walletAddress,
          to: '0x0987654321FEDCBA0987654321FEDCBA09876543',
          chainId
        },
        {
          id: '6',
          hash: '0x6789012345abcdef6789012345abcdef6789012345abcdef6789012345abcdef',
          type: 'Deposit',
          amount: '0.8',
          tokenSymbol: 'ETH',
          date: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), // 4 days ago
          status: 'Completed',
          from: '0xFEDCBA0987654321FEDCBA0987654321FEDCBA09',
          to: walletAddress,
          chainId
        }
      ]

      // In a real implementation, you would:
      // 1. Get transaction history from ethers.js provider
      // 2. Parse transactions to get token transfers and interactions
      // 3. Format them for display
      
      setTransactions(mockTransactions)
    } catch (error) {
      console.error("Error fetching transaction history:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter transactions if a filter is set
  const filteredTransactions = filter
    ? transactions.filter(tx => tx.type === filter)
    : transactions

  // Format relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    
    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      const hours = Math.floor(diffHours)
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    } else {
      const days = Math.floor(diffHours / 24)
      return `${days} day${days !== 1 ? 's' : ''} ago`
    }
  }

  // Get transaction icon based on type
  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'Deposit':
        return <Download className="h-4 w-4 text-success" />
      case 'Withdraw':
        return <Upload className="h-4 w-4 text-danger" />
      case 'Transfer':
        return <Send className="h-4 w-4 text-primary" />
      case 'Swap':
        return <RefreshCw className="h-4 w-4 text-warning" />
      case 'Contract Interaction':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  // Get transaction chain explorer URL
  const getExplorerUrl = (hash: string) => {
    // In a real app, use the appropriate explorer based on chainId
    return `https://etherscan.io/tx/${hash}`
  }

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <div className="transaction-history">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Transaction History
        </h2>
        <div className="flex items-center">
          {/* Transaction type filter */}
          <div className="relative mr-2">
            <button 
              className="btn-ghost flex items-center text-sm p-2"
              onClick={() => setFilter(filter ? null : 'Filter')}
            >
              <Filter className="h-4 w-4 mr-1" />
              {filter || 'All'}
            </button>
            {filter === 'Filter' && (
              <div className="absolute right-0 mt-2 bg-card border border-border rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button 
                    className="block px-4 py-2 text-sm hover:bg-muted w-full text-left"
                    onClick={() => setFilter(null)}
                  >
                    All
                  </button>
                  <button 
                    className="block px-4 py-2 text-sm hover:bg-muted w-full text-left"
                    onClick={() => setFilter('Deposit')}
                  >
                    Deposits
                  </button>
                  <button 
                    className="block px-4 py-2 text-sm hover:bg-muted w-full text-left"
                    onClick={() => setFilter('Withdraw')}
                  >
                    Withdrawals
                  </button>
                  <button 
                    className="block px-4 py-2 text-sm hover:bg-muted w-full text-left"
                    onClick={() => setFilter('Transfer')}
                  >
                    Transfers
                  </button>
                  <button 
                    className="block px-4 py-2 text-sm hover:bg-muted w-full text-left"
                    onClick={() => setFilter('Swap')}
                  >
                    Swaps
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Refresh button */}
          <button 
            className="btn-ghost p-2 rounded-full"
            onClick={fetchTransactions}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-sm text-muted-foreground">
                    <th className="text-left pb-2">Type</th>
                    <th className="text-left pb-2">Amount</th>
                    <th className="text-left pb-2 hidden md:table-cell">Date</th>
                    <th className="text-left pb-2 hidden md:table-cell">Status</th>
                    <th className="text-right pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.slice(0, maxItems).map(tx => (
                    <tr key={tx.id} className="border-t border-border">
                      <td className="py-3 flex items-center">
                        <div className="mr-2">
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div>
                          <div className="font-medium">{tx.type}</div>
                          <div className="text-xs text-muted-foreground md:hidden">
                            {getRelativeTime(tx.date)}
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="font-medium">
                          {tx.amount} {tx.tokenSymbol}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {tx.type === 'Deposit' 
                            ? `From: ${formatAddress(tx.from)}`
                            : `To: ${formatAddress(tx.to)}`
                          }
                        </div>
                      </td>
                      <td className="py-3 hidden md:table-cell text-muted-foreground text-sm">
                        {getRelativeTime(tx.date)}
                      </td>
                      <td className="py-3 hidden md:table-cell">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs
                          ${tx.status === 'Completed' ? 'bg-success/10 text-success' : 
                            tx.status === 'Pending' ? 'bg-warning/10 text-warning' : 
                            'bg-danger/10 text-danger'}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <a 
                          href={getExplorerUrl(tx.hash)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary p-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
