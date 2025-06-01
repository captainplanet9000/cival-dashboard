"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  RefreshCw, 
  ArrowDown, 
  ArrowUp, 
  ArrowLeft, 
  ArrowRight, 
  ExternalLink,
  Check,
  Clock,
  XCircle,
  Filter,
  Download
} from 'lucide-react'
import { bankingService, Transaction } from '@/services/banking-service'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from '@/components/ui/badge'

interface TransactionsPanelProps {
  userId?: string
  assetFilter?: string
  limit?: number
}

export default function TransactionsPanel({ userId = '1', assetFilter, limit = 20 }: TransactionsPanelProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [currentAssetFilter, setCurrentAssetFilter] = useState<string | null>(assetFilter || null)
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Set initial filter from URL if available
    const assetParam = searchParams.get('asset')
    const typeParam = searchParams.get('type')
    
    if (assetParam) {
      setCurrentAssetFilter(assetParam)
    }
    
    if (typeParam) {
      setTypeFilter(typeParam)
    }
    
    fetchTransactions()
  }, [userId, assetFilter, searchParams])

  const fetchTransactions = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await bankingService.getTransactions(userId, limit)
      
      if (fetchError) {
        setError(fetchError)
        toast({
          title: "Error loading transactions",
          description: fetchError,
          variant: "destructive",
        })
      } else if (data) {
        setTransactions(data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions')
      toast({
        title: "Error",
        description: "Failed to load transaction data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    toast({
      description: "Refreshing transactions...",
    })
    fetchTransactions()
  }

  const handleExport = () => {
    // Format transactions for CSV
    const csvContent = [
      // Header
      ["Id", "Type", "Asset", "Amount", "From", "To", "Status", "Date", "Fee", "Notes"].join(","),
      // Data rows
      ...filteredTransactions.map(tx => [
        tx.id,
        tx.type,
        tx.asset,
        tx.amount,
        tx.from,
        tx.to,
        tx.status,
        new Date(tx.timestamp).toLocaleString(),
        tx.fee,
        `"${tx.notes?.replace(/"/g, '""') || ''}"`
      ].join(","))
    ].join("\n")
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "Transactions Exported",
      description: "Your transaction history has been downloaded as CSV",
    })
  }

  // Apply filters to transactions
  const filteredTransactions = transactions.filter(tx => {
    if (currentAssetFilter && tx.asset !== currentAssetFilter) return false
    if (typeFilter && tx.type !== typeFilter) return false
    return true
  })

  // Render transaction icon based on type
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDown className="h-4 w-4 text-success" />
      case 'withdrawal':
        return <ArrowUp className="h-4 w-4 text-destructive" />
      case 'transfer':
        return <ArrowRight className="h-4 w-4 text-primary" />
      case 'fee':
        return <ArrowLeft className="h-4 w-4 text-warning" />
      case 'interest':
        return <ArrowDown className="h-4 w-4 text-success" />
      case 'allocation':
        return <ArrowRight className="h-4 w-4 text-primary" />
      default:
        return <ArrowRight className="h-4 w-4" />
    }
  }

  // Render status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30 flex items-center gap-1">
          <Check className="h-3 w-3" /> Complete
        </Badge>
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 flex items-center gap-1">
          <Clock className="h-3 w-3" /> Pending
        </Badge>
      case 'failed':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Failed
        </Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Format amount with sign and symbol
  const formatAmount = (transaction: Transaction) => {
    const isIncoming = ['deposit', 'interest'].includes(transaction.type)
    const prefix = isIncoming ? '+' : '-'
    return (
      <span className={isIncoming ? 'text-success' : 'text-destructive'}>
        {prefix}{transaction.amount.toLocaleString()} {transaction.asset}
      </span>
    )
  }

  // Format date in a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Render loading state
  if (loading) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Transaction History</h2>
          <Button variant="ghost" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="dashboard-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Transaction History</h2>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <div className="p-4 border border-destructive/30 bg-destructive/10 rounded-md text-destructive text-center">
          <p className="font-medium">Failed to load transaction data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Transaction History</h2>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Transaction Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setTypeFilter(null)}>
                  <Check className={`mr-2 h-4 w-4 ${!typeFilter ? 'opacity-100' : 'opacity-0'}`} />
                  All Types
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('deposit')}>
                  <Check className={`mr-2 h-4 w-4 ${typeFilter === 'deposit' ? 'opacity-100' : 'opacity-0'}`} />
                  Deposits
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('withdrawal')}>
                  <Check className={`mr-2 h-4 w-4 ${typeFilter === 'withdrawal' ? 'opacity-100' : 'opacity-0'}`} />
                  Withdrawals
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('transfer')}>
                  <Check className={`mr-2 h-4 w-4 ${typeFilter === 'transfer' ? 'opacity-100' : 'opacity-0'}`} />
                  Transfers
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter('allocation')}>
                  <Check className={`mr-2 h-4 w-4 ${typeFilter === 'allocation' ? 'opacity-100' : 'opacity-0'}`} />
                  Allocations
                </DropdownMenuItem>
              </DropdownMenuGroup>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Asset</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => setCurrentAssetFilter(null)}>
                <Check className={`mr-2 h-4 w-4 ${!currentAssetFilter ? 'opacity-100' : 'opacity-0'}`} />
                All Assets
              </DropdownMenuItem>
              
              {/* Get unique assets from transactions */}
              {[...new Set(transactions.map(tx => tx.asset))].map(asset => (
                <DropdownMenuItem key={asset} onClick={() => setCurrentAssetFilter(asset)}>
                  <Check className={`mr-2 h-4 w-4 ${currentAssetFilter === asset ? 'opacity-100' : 'opacity-0'}`} />
                  {asset}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export as CSV</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Active filters */}
      {(currentAssetFilter || typeFilter) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {currentAssetFilter && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Asset: {currentAssetFilter}
              <XCircle
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => setCurrentAssetFilter(null)}
              />
            </Badge>
          )}
          
          {typeFilter && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Type: {typeFilter}
              <XCircle
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => setTypeFilter(null)}
              />
            </Badge>
          )}
        </div>
      )}
      
      {filteredTransactions.length === 0 ? (
        <div className="p-8 text-center border rounded-md bg-muted/30">
          <p className="text-muted-foreground">No transactions found{currentAssetFilter ? ` for ${currentAssetFilter}` : ''}{typeFilter ? ` of type ${typeFilter}` : ''}</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden lg:table-cell">ID/Hash</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(transaction.type)}
                      <span className="capitalize">{transaction.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{transaction.asset}</TableCell>
                  <TableCell>{formatAmount(transaction)}</TableCell>
                  <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatDate(transaction.timestamp)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {transaction.txHash 
                      ? `${transaction.txHash.substring(0, 8)}...${transaction.txHash.substring(transaction.txHash.length - 6)}`
                      : transaction.id
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Options</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => {}}>
                          View Details
                        </DropdownMenuItem>
                        {transaction.txHash && (
                          <DropdownMenuItem onClick={() => window.open(`https://etherscan.io/tx/${transaction.txHash}`, '_blank')}>
                            View on Blockchain
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => {
                          navigator.clipboard.writeText(transaction.id)
                          toast({
                            description: "Transaction ID copied to clipboard",
                          })
                        }}>
                          Copy Transaction ID
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
