'use client';

/**
 * Wallet Transaction History Component
 * Displays transaction history with filtering and sorting
 */
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ExternalLink,
  Search,
  Download,
  Filter,
  Clock,
  History,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'trade' | 'fee' | 'other';
  amount: number;
  currency: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  txHash?: string;
  destination?: string;
  source?: string;
  fee?: number;
  feeCurrency?: string;
  note?: string;
}

interface WalletTransactionHistoryProps {
  transactions: Transaction[];
  currency: string;
}

export function WalletTransactionHistory({ transactions, currency }: WalletTransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('date_newest');
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>(transactions);
  const [expandedTransactions, setExpandedTransactions] = useState<Record<string, boolean>>({});

  // Filter and sort transactions when dependencies change
  useEffect(() => {
    let result = [...transactions];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(tx => 
        tx.txHash?.toLowerCase().includes(term) ||
        tx.destination?.toLowerCase().includes(term) ||
        tx.source?.toLowerCase().includes(term) ||
        tx.note?.toLowerCase().includes(term) ||
        tx.id.toLowerCase().includes(term)
      );
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter(tx => tx.type === typeFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(tx => tx.status === statusFilter);
    }
    
    // Apply date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      result = result.filter(tx => new Date(tx.timestamp) >= startDate);
    }
    
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // End of the day
      result = result.filter(tx => new Date(tx.timestamp) <= endDate);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date_newest':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'date_oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'amount_highest':
          return b.amount - a.amount;
        case 'amount_lowest':
          return a.amount - b.amount;
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });
    
    setFilteredTransactions(result);
  }, [transactions, searchTerm, typeFilter, statusFilter, dateRange, sortBy]);

  // Toggle transaction expansion
  const toggleTransactionExpansion = (txId: string) => {
    setExpandedTransactions(prev => ({
      ...prev,
      [txId]: !prev[txId]
    }));
  };

  // Format currency with appropriate symbol
  const formatCurrency = (amount: number, curr: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr === 'BTC' || curr === 'ETH' ? 'USD' : curr,
      minimumFractionDigits: curr === 'BTC' || curr === 'ETH' ? 8 : 2,
      maximumFractionDigits: curr === 'BTC' || curr === 'ETH' ? 8 : 2,
    });
    
    // Handle special cases for crypto
    if (curr === 'BTC') {
      return `₿${amount.toFixed(8)}`;
    } else if (curr === 'ETH') {
      return `Ξ${amount.toFixed(6)}`;
    }
    
    return formatter.format(amount);
  };

  // Export transactions to CSV
  const exportToCSV = () => {
    if (filteredTransactions.length === 0) return;
    
    const headers = ['ID', 'Type', 'Amount', 'Currency', 'Date', 'Status', 'TX Hash', 'Source', 'Destination', 'Fee', 'Fee Currency', 'Note'];
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(tx => [
        tx.id,
        tx.type,
        tx.amount,
        tx.currency,
        format(new Date(tx.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        tx.status,
        tx.txHash || '',
        tx.source || '',
        tx.destination || '',
        tx.fee || '',
        tx.feeCurrency || '',
        tx.note ? `"${tx.note.replace(/"/g, '""')}"` : ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `wallet_transactions_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get transaction type icon
  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownRight className="h-4 w-4 text-green-500" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'transfer':
        return <ArrowUpRight className="h-4 w-4 text-blue-500" />;
      case 'trade':
        return <History className="h-4 w-4 text-purple-500" />;
      case 'fee':
        return <FileText className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>View and filter transaction records</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={exportToCSV}
              disabled={filteredTransactions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="withdrawal">Withdrawals</SelectItem>
                <SelectItem value="transfer">Transfers</SelectItem>
                <SelectItem value="trade">Trades</SelectItem>
                <SelectItem value="fee">Fees</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_newest">Newest First</SelectItem>
                <SelectItem value="date_oldest">Oldest First</SelectItem>
                <SelectItem value="amount_highest">Highest Amount</SelectItem>
                <SelectItem value="amount_lowest">Lowest Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Date Range Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">From:</span>
            <Input
              type="date"
              className="w-auto"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">To:</span>
            <Input
              type="date"
              className="w-auto"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDateRange({ start: '', end: '' })}
            className="ml-auto"
          >
            Clear Dates
          </Button>
        </div>
        
        {/* Transaction List */}
        {filteredTransactions.length > 0 ? (
          <div className="space-y-3">
            {filteredTransactions.map(tx => (
              <Collapsible
                key={tx.id}
                open={expandedTransactions[tx.id]}
                onOpenChange={() => toggleTransactionExpansion(tx.id)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md hover:bg-muted/50 cursor-pointer text-left">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        {getTransactionTypeIcon(tx.type)}
                      </div>
                      <div>
                        <div className="font-medium capitalize">{tx.type}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(tx.timestamp), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2 sm:mt-0">
                      <Badge className={getStatusBadgeClass(tx.status)}>
                        {tx.status}
                      </Badge>
                      <div className={`font-medium ${
                        tx.type === 'deposit' ? 'text-green-600' : 
                        tx.type === 'withdrawal' || tx.type === 'fee' ? 'text-red-600' : ''
                      }`}>
                        {tx.type === 'deposit' ? '+' : 
                         tx.type === 'withdrawal' || tx.type === 'fee' ? '-' : ''}
                        {formatCurrency(tx.amount, tx.currency)}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 border-x border-b rounded-b-md bg-muted/30 space-y-4">
                    {/* Transaction Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Transaction Details</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-muted-foreground">ID</div>
                          <div className="font-mono text-xs truncate">{tx.id}</div>
                          
                          <div className="text-muted-foreground">Type</div>
                          <div className="capitalize">{tx.type}</div>
                          
                          <div className="text-muted-foreground">Status</div>
                          <div className="capitalize">{tx.status}</div>
                          
                          <div className="text-muted-foreground">Timestamp</div>
                          <div>{format(new Date(tx.timestamp), 'PPpp')}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Financial Details</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-muted-foreground">Amount</div>
                          <div>{formatCurrency(tx.amount, tx.currency)}</div>
                          
                          <div className="text-muted-foreground">Currency</div>
                          <div>{tx.currency}</div>
                          
                          {tx.fee !== undefined && (
                            <>
                              <div className="text-muted-foreground">Fee</div>
                              <div>
                                {tx.fee ? formatCurrency(tx.fee, tx.feeCurrency || tx.currency) : 'None'}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional Details */}
                    <div className="space-y-2">
                      {tx.txHash && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                          <div className="text-muted-foreground">Transaction Hash:</div>
                          <div className="font-mono text-xs truncate">{tx.txHash}</div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View on blockchain explorer</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                      
                      {tx.source && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                          <div className="text-muted-foreground">From:</div>
                          <div className="font-mono text-xs truncate">{tx.source}</div>
                        </div>
                      )}
                      
                      {tx.destination && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                          <div className="text-muted-foreground">To:</div>
                          <div className="font-mono text-xs truncate">{tx.destination}</div>
                        </div>
                      )}
                      
                      {tx.note && (
                        <div className="mt-3 text-sm">
                          <div className="text-muted-foreground mb-1">Note:</div>
                          <div className="p-2 bg-muted rounded-md">{tx.note}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <History className="h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">No transactions found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' || dateRange.start || dateRange.end 
                ? "Try adjusting your filters to see more results" 
                : "Your transaction history will appear here"}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setTypeFilter('all');
              setStatusFilter('all');
              setDateRange({ start: '', end: '' });
            }}
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
