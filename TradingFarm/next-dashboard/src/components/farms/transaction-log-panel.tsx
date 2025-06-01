/**
 * Transaction Log Panel
 * Component for viewing and reconciling transaction logs
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  Download,
  ArrowDownUp,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { createClientClient } from '@/utils/supabase/client';
import { TransactionType, TransactionStatus, TransactionRecord } from '@/services/transaction-service';

interface TransactionLogPanelProps {
  farmId: string;
  walletId?: string;
}

export function TransactionLogPanel({ farmId, walletId }: TransactionLogPanelProps) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [reconciliationResults, setReconciliationResults] = useState<any>(null);
  const [filters, setFilters] = useState({
    type: '' as TransactionType | '',
    status: '' as TransactionStatus | '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });
  const [wallets, setWallets] = useState<{id: string, wallet_name: string}[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>(walletId || '');
  
  const { toast } = useToast();
  const supabase = createClientClient();
  
  // Load transactions on component mount
  useEffect(() => {
    if (walletId) {
      setSelectedWalletId(walletId);
    }
    loadWallets();
    loadTransactions();
  }, [farmId, walletId]);
  
  // Reload transactions when filters or pagination change
  useEffect(() => {
    loadTransactions();
  }, [filters, pagination.page, pagination.limit, selectedWalletId]);
  
  // Load wallets for the farm
  const loadWallets = async () => {
    try {
      const { data, error } = await supabase
        .from('farm_wallets')
        .select('id, wallet_name')
        .eq('farm_id', farmId);
        
      if (error) throw error;
      
      setWallets(data || []);
      
      // Set the first wallet as selected if no wallet is specified
      if (!walletId && data?.length > 0 && !selectedWalletId) {
        setSelectedWalletId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
    }
  };
  
  // Load transactions from database
  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      const offset = (pagination.page - 1) * pagination.limit;
      
      // Prepare query parameters
      const params = new URLSearchParams();
      params.append('limit', pagination.limit.toString());
      params.append('offset', offset.toString());
      
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.search) params.append('search', filters.search);
      
      // Decide whether to fetch farm-level or wallet-level transactions
      let url = `/api/farms/${farmId}/transactions`;
      if (selectedWalletId) {
        url = `/api/farms/${farmId}/wallets/${selectedWalletId}/transactions`;
      }
      
      const response = await fetch(`${url}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to load transactions');
      }
      
      const data = await response.json();
      
      setTransactions(data.transactions || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0
      }));
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Reconcile transactions with exchange
  const reconcileTransactions = async () => {
    if (!selectedWalletId) {
      toast({
        title: "Error",
        description: "Please select a wallet to reconcile transactions",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setReconciling(true);
      
      const response = await fetch(`/api/farms/${farmId}/wallets/${selectedWalletId}/reconcile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to reconcile transactions');
      }
      
      const results = await response.json();
      
      setReconciliationResults(results);
      
      toast({
        title: "Success",
        description: "Transaction reconciliation completed"
      });
      
      // Reload transactions to show updated data
      loadTransactions();
    } catch (error) {
      console.error('Error reconciling transactions:', error);
      toast({
        title: "Error",
        description: "Failed to reconcile transactions",
        variant: "destructive"
      });
    } finally {
      setReconciling(false);
    }
  };
  
  // Export transactions to CSV
  const exportTransactions = () => {
    try {
      if (transactions.length === 0) {
        toast({
          title: "Error",
          description: "No transactions to export",
          variant: "destructive"
        });
        return;
      }
      
      // Create CSV content
      const headers = [
        'Transaction ID',
        'Type',
        'Symbol',
        'Amount',
        'Price',
        'Fee',
        'Status',
        'Timestamp',
        'Exchange Reported',
        'Locally Recorded'
      ];
      
      const csvContent = [
        headers.join(','),
        ...transactions.map(tx => [
          tx.transactionId || '',
          tx.transactionType,
          tx.symbol || '',
          tx.amount,
          tx.price || '',
          tx.fee || '',
          tx.status,
          tx.timestamp,
          tx.exchangeReported ? 'Yes' : 'No',
          tx.locallyRecorded ? 'Yes' : 'No'
        ].join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${farmId}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: "Transactions exported successfully"
      });
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast({
        title: "Error",
        description: "Failed to export transactions",
        variant: "destructive"
      });
    }
  };
  
  // Format amount with currency
  const formatAmount = (amount?: number, symbol?: string) => {
    if (!amount) return '-';
    
    let formattedAmount = amount.toString();
    
    // Format based on amount size
    if (Math.abs(amount) >= 1000) {
      formattedAmount = amount.toFixed(2);
    } else if (Math.abs(amount) >= 1) {
      formattedAmount = amount.toFixed(4);
    } else {
      formattedAmount = amount.toFixed(8);
    }
    
    if (symbol) {
      // Try to extract base currency from symbol (e.g., BTC/USDT -> BTC)
      let currency = symbol;
      if (symbol.includes('/')) {
        currency = symbol.split('/')[0];
      }
      
      return `${formattedAmount} ${currency}`;
    }
    
    return formattedAmount;
  };
  
  // Render transaction status badge
  const renderStatus = (status: TransactionStatus) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'disputed':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Disputed
          </Badge>
        );
      default:
        return status;
    }
  };
  
  // Render transaction type badge
  const renderType = (type: TransactionType) => {
    switch (type) {
      case 'deposit':
        return (
          <Badge className="bg-green-50 text-green-700 hover:bg-green-100">
            Deposit
          </Badge>
        );
      case 'withdrawal':
        return (
          <Badge className="bg-orange-50 text-orange-700 hover:bg-orange-100">
            Withdrawal
          </Badge>
        );
      case 'trade':
        return (
          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100">
            Trade
          </Badge>
        );
      case 'fee':
        return (
          <Badge className="bg-gray-50 text-gray-700 hover:bg-gray-100">
            Fee
          </Badge>
        );
      case 'transfer':
        return (
          <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-100">
            Transfer
          </Badge>
        );
      default:
        return type;
    }
  };
  
  // Filter controls
  const FilterControls = () => (
    <div className="flex flex-col md:flex-row gap-2 mb-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-grow">
        <Select
          value={filters.type}
          onValueChange={(value) => setFilters({...filters, type: value as TransactionType | ''})}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="withdrawal">Withdrawal</SelectItem>
            <SelectItem value="trade">Trade</SelectItem>
            <SelectItem value="fee">Fee</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
        
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters({...filters, status: value as TransactionStatus | ''})}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>
        
        <Input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({...filters, startDate: e.target.value})}
          placeholder="Start Date"
        />
        
        <Input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({...filters, endDate: e.target.value})}
          placeholder="End Date"
        />
      </div>
      
      <div className="flex gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="pl-8"
          />
        </div>
        
        <Button variant="outline" onClick={() => {
          setFilters({
            type: '',
            status: '',
            startDate: '',
            endDate: '',
            search: ''
          });
          setPagination({...pagination, page: 1});
        }}>
          Clear
        </Button>
      </div>
    </div>
  );
  
  // Wallet selector
  const WalletSelector = () => (
    <div className="mb-4">
      <Select
        value={selectedWalletId}
        onValueChange={setSelectedWalletId}
        disabled={wallets.length === 0}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select Wallet" />
        </SelectTrigger>
        <SelectContent>
          {wallets.length === 0 ? (
            <SelectItem value="" disabled>No wallets available</SelectItem>
          ) : (
            <>
              <SelectItem value="">All Wallets</SelectItem>
              {wallets.map(wallet => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.wallet_name}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
  
  // Reconciliation summary
  const ReconciliationSummary = () => {
    if (!reconciliationResults) return null;
    
    const { matched, unmatched } = reconciliationResults;
    
    return (
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Reconciliation Results</AlertTitle>
        <AlertDescription>
          <div className="mt-2 text-sm">
            <div className="flex justify-between">
              <span>Matched transactions:</span>
              <span className="font-medium">{matched.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Local-only transactions:</span>
              <span className="font-medium">{unmatched.localOnly.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Exchange-only transactions:</span>
              <span className="font-medium">{unmatched.exchangeOnly.length}</span>
            </div>
            {unmatched.localOnly.length > 0 || unmatched.exchangeOnly.length > 0 ? (
              <div className="mt-2 text-yellow-600">
                There are discrepancies between local and exchange records.
                {unmatched.exchangeOnly.length > 0 && 
                  " New transactions from the exchange have been added to your records."}
              </div>
            ) : (
              <div className="mt-2 text-green-600">
                All transactions are reconciled with the exchange.
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  };
  
  // Transaction table
  const TransactionTable = () => (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
                Loading transactions...
              </TableCell>
            </TableRow>
          ) : transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((tx) => (
              <TableRow key={tx.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>{renderType(tx.transactionType)}</TableCell>
                <TableCell>{tx.symbol || '-'}</TableCell>
                <TableCell>{formatAmount(tx.amount, tx.symbol)}</TableCell>
                <TableCell>
                  {tx.price ? `${tx.price.toFixed(tx.price < 1 ? 8 : 2)}` : '-'}
                </TableCell>
                <TableCell>{renderStatus(tx.status)}</TableCell>
                <TableCell>
                  {tx.timestamp ? format(new Date(tx.timestamp), 'PPp') : '-'}
                </TableCell>
                <TableCell>
                  {tx.exchangeReported && tx.locallyRecorded ? (
                    <Badge variant="outline" className="bg-green-50">Both</Badge>
                  ) : tx.exchangeReported ? (
                    <Badge variant="outline" className="bg-blue-50">Exchange</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-orange-50">Local</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {/* Pagination controls */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} transactions
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination({...pagination, page: pagination.page - 1})}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination({...pagination, page: pagination.page + 1})}
            disabled={pagination.page * pagination.limit >= pagination.total}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between gap-2">
          <div>
            <CardTitle>Transaction Log</CardTitle>
            <CardDescription>
              View and reconcile transaction records
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="default" 
              onClick={reconcileTransactions}
              disabled={reconciling || !selectedWalletId}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${reconciling ? 'animate-spin' : ''}`} />
              {reconciling ? 'Reconciling...' : 'Reconcile'}
            </Button>
            
            <Button
              variant="outline"
              onClick={exportTransactions}
              disabled={transactions.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {!walletId && <WalletSelector />}
        
        <ReconciliationSummary />
        
        <FilterControls />
        
        <TransactionTable />
      </CardContent>
    </Card>
  );
}
