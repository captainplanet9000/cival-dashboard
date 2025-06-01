/**
 * Trading Farm Multi-Chain Integration
 * UnifiedTransactionFeed - Component for displaying transactions across multiple chains
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCcw,
  ArrowUpDown,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Filter,
  ArrowRight,
  Activity,
  Coins,
  ArrowLeftRight
} from 'lucide-react';
import { useWallet } from '../wallets/UnifiedWalletConnector';

interface Transaction {
  id: string;
  chainSlug: string;
  txHash: string;
  type: 'trade' | 'bridge' | 'deposit' | 'withdrawal' | 'approval' | 'other';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  from: string;
  to: string;
  assetSymbol?: string;
  assetAmount?: string;
  destinationChain?: string; // For bridge transactions
  destinationAsset?: string; // For bridge transactions
  destinationAmount?: string; // For bridge transactions
  feeAmount?: string;
  feeAsset?: string;
  usdValue?: string;
  metadata?: Record<string, any>;
}

// Chain configuration with explorer URLs
const CHAIN_CONFIG = {
  evm: { 
    name: 'Ethereum', 
    color: '#627EEA', 
    icon: '🔷',
    explorerUrl: 'https://etherscan.io/tx/'
  },
  sonic: { 
    name: 'Sonic', 
    color: '#0A6EBD', 
    icon: '⚡',
    explorerUrl: 'https://explorer.sonic.com/tx/'
  },
  sui: { 
    name: 'Sui', 
    color: '#6FBCF0', 
    icon: '🔵',
    explorerUrl: 'https://explorer.sui.io/txblock/'
  },
  solana: { 
    name: 'Solana', 
    color: '#9945FF', 
    icon: '🟣',
    explorerUrl: 'https://explorer.solana.com/tx/'
  }
};

// Mock data for development - would be fetched from APIs in production
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    chainSlug: 'evm',
    txHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
    type: 'trade',
    status: 'confirmed',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    from: '0x1234567890abcdef1234567890abcdef12345678',
    to: '0xabcdef1234567890abcdef1234567890abcdef12',
    assetSymbol: 'ETH',
    assetAmount: '1.5',
    feeAmount: '0.005',
    feeAsset: 'ETH',
    usdValue: '3000'
  },
  {
    id: '2',
    chainSlug: 'sonic',
    txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
    type: 'bridge',
    status: 'confirmed',
    timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    from: '0x1234567890abcdef1234567890abcdef12345678',
    to: '0xabcdef1234567890abcdef1234567890abcdef12',
    assetSymbol: 'USDC',
    assetAmount: '1000',
    destinationChain: 'sui',
    destinationAsset: 'USDC',
    destinationAmount: '998.5',
    feeAmount: '0.001',
    feeAsset: 'ETH',
    usdValue: '1000'
  },
  {
    id: '3',
    chainSlug: 'sui',
    txHash: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    type: 'trade',
    status: 'confirmed',
    timestamp: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
    from: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b',
    to: '0xe4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3',
    assetSymbol: 'SUI',
    assetAmount: '100',
    feeAmount: '0.01',
    feeAsset: 'SUI',
    usdValue: '325'
  },
  {
    id: '4',
    chainSlug: 'solana',
    txHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    type: 'trade',
    status: 'confirmed',
    timestamp: new Date(Date.now() - 28800000).toISOString(), // 8 hours ago
    from: 'abcdef1234567890abcdef1234567890abcdef12',
    to: '1234567890abcdef1234567890abcdef12345678',
    assetSymbol: 'SOL',
    assetAmount: '10',
    feeAmount: '0.0001',
    feeAsset: 'SOL',
    usdValue: '400'
  },
  {
    id: '5',
    chainSlug: 'solana',
    txHash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    type: 'bridge',
    status: 'pending',
    timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    from: 'abcdef1234567890abcdef1234567890abcdef12',
    to: '1234567890abcdef1234567890abcdef12345678',
    assetSymbol: 'USDC',
    assetAmount: '500',
    destinationChain: 'evm',
    destinationAsset: 'USDC',
    destinationAmount: '499',
    feeAmount: '0.0005',
    feeAsset: 'SOL',
    usdValue: '500'
  },
  {
    id: '6',
    chainSlug: 'evm',
    txHash: '0xe4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3',
    type: 'deposit',
    status: 'confirmed',
    timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
    from: '0x1234567890abcdef1234567890abcdef12345678',
    to: '0xabcdef1234567890abcdef1234567890abcdef12',
    assetSymbol: 'USDC',
    assetAmount: '5000',
    feeAmount: '0.003',
    feeAsset: 'ETH',
    usdValue: '5000'
  },
  {
    id: '7',
    chainSlug: 'sui',
    txHash: '0xa4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3',
    type: 'bridge',
    status: 'failed',
    timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    from: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b',
    to: '0xe4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3',
    assetSymbol: 'USDC',
    assetAmount: '1500',
    destinationChain: 'solana',
    destinationAsset: 'USDC',
    destinationAmount: '1495',
    feeAmount: '0.05',
    feeAsset: 'SUI',
    usdValue: '1500'
  }
];

export function UnifiedTransactionFeed({ vaultId }: { vaultId: string }) {
  const { walletState } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Fetch transaction data - would call API in production
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // In production, this would fetch real data from APIs
        // For now, we're using mock data
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set mock data
        setTransactions(MOCK_TRANSACTIONS);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching transaction data:', error);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [vaultId]);
  
  // Filter transactions based on selected chain, type, and search query
  const filteredTransactions = transactions.filter(tx => {
    // Filter by chain
    if (selectedChain !== 'all' && tx.chainSlug !== selectedChain) {
      return false;
    }
    
    // Filter by type
    if (selectedType !== 'all' && tx.type !== selectedType) {
      return false;
    }
    
    // Filter by search query (tx hash or asset symbol)
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        tx.txHash.toLowerCase().includes(searchLower) ||
        (tx.assetSymbol && tx.assetSymbol.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });
  
  // Function to format relative time
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) {
      return 'Just now';
    } else if (diffSec < 3600) {
      const mins = Math.floor(diffSec / 60);
      return `${mins} min${mins > 1 ? 's' : ''} ago`;
    } else if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `${hours} hr${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffSec / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };
  
  // Function to get transaction type icon
  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'trade':
        return <ArrowUpDown className="h-4 w-4" />;
      case 'bridge':
        return <ArrowLeftRight className="h-4 w-4" />;
      case 'deposit':
        return <ArrowRight className="h-4 w-4" />;
      case 'withdrawal':
        return <ArrowRight className="h-4 w-4 transform rotate-180" />;
      case 'approval':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };
  
  // Function to get transaction status style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/10 text-green-500';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'failed':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };
  
  // Function to get transaction status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your transactions across all chains</CardDescription>
          </div>
          
          <Button variant="outline" size="sm" onClick={() => setIsLoading(true)}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by tx hash or asset..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex gap-4">
            <Select value={selectedChain} onValueChange={setSelectedChain}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Chain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chains</SelectItem>
                {Object.entries(CHAIN_CONFIG).map(([slug, config]) => (
                  <SelectItem key={slug} value={slug}>
                    <span className="flex items-center">
                      {config.icon} {config.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="trade">Trades</SelectItem>
                <SelectItem value="bridge">Bridges</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="withdrawal">Withdrawals</SelectItem>
                <SelectItem value="approval">Approvals</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Transaction List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No transactions found</p>
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div key={tx.id} className="border rounded-md p-4">
                  {/* Transaction Header */}
                  <div className="flex flex-wrap justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusStyle(tx.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(tx.status)}
                          <span>{tx.status}</span>
                        </span>
                      </Badge>
                      
                      <Badge variant="outline">
                        <span className="flex items-center gap-1">
                          {getTransactionTypeIcon(tx.type)}
                          <span className="capitalize">{tx.type}</span>
                        </span>
                      </Badge>
                      
                      <Badge variant="outline">
                        <span className="flex items-center gap-1">
                          {CHAIN_CONFIG[tx.chainSlug as keyof typeof CHAIN_CONFIG]?.icon}
                          <span>{CHAIN_CONFIG[tx.chainSlug as keyof typeof CHAIN_CONFIG]?.name}</span>
                        </span>
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatRelativeTime(tx.timestamp)}</span>
                    </div>
                  </div>
                  
                  {/* Transaction Content */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Hash:</span>
                        <code className="text-xs truncate max-w-[200px]">{tx.txHash}</code>
                        <a
                          href={`${CHAIN_CONFIG[tx.chainSlug as keyof typeof CHAIN_CONFIG]?.explorerUrl}${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">From:</span>
                        <code className="text-xs truncate max-w-[200px]">{tx.from}</code>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">To:</span>
                        <code className="text-xs truncate max-w-[200px]">{tx.to}</code>
                      </div>
                    </div>
                    
                    <div>
                      {tx.type === 'bridge' ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {tx.assetAmount} {tx.assetSymbol}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {tx.destinationAmount} {tx.destinationAsset}
                            </span>
                            <Badge variant="outline" className="ml-1">
                              {CHAIN_CONFIG[tx.destinationChain as keyof typeof CHAIN_CONFIG]?.icon}
                              {CHAIN_CONFIG[tx.destinationChain as keyof typeof CHAIN_CONFIG]?.name}
                            </Badge>
                          </div>
                          
                          {tx.usdValue && (
                            <div className="text-sm text-muted-foreground">
                              Value: ${parseFloat(tx.usdValue).toLocaleString()}
                            </div>
                          )}
                          
                          {tx.feeAmount && (
                            <div className="text-sm text-muted-foreground">
                              Fee: {tx.feeAmount} {tx.feeAsset}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {tx.assetAmount && tx.assetSymbol && (
                            <div className="flex items-center gap-2">
                              <Coins className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {tx.assetAmount} {tx.assetSymbol}
                              </span>
                            </div>
                          )}
                          
                          {tx.usdValue && (
                            <div className="text-sm text-muted-foreground">
                              Value: ${parseFloat(tx.usdValue).toLocaleString()}
                            </div>
                          )}
                          
                          {tx.feeAmount && (
                            <div className="text-sm text-muted-foreground">
                              Fee: {tx.feeAmount} {tx.feeAsset}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <div className="flex justify-between items-center w-full">
          <div className="text-sm text-muted-foreground">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </div>
          
          {filteredTransactions.length > 0 && (
            <Button variant="outline" size="sm">
              View More
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
