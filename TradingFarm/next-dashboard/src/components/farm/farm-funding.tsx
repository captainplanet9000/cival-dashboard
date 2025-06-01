import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from '@/components/ui/separator';
import { SimpleFarmFundingError, SimpleFarmFundingErrorType } from './farm-funding-error';
import { useAccount, useBalance, useContractWrite, usePublicClient } from 'wagmi';
import { parseEther } from 'viem';
import { AlertCircle, ChevronDown, ArrowUpRight, ArrowDownRight, Clock, ExternalLink, Loader2, Landmark, ChevronRight, Activity, Wallet } from 'lucide-react';

// Import Table components with relative path to avoid errors
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/table";

type Farm = {
  id: string;
  name: string;
  type: string; 
  riskLevel: 'Low' | 'Medium' | 'High';
  status: 'Active' | 'Inactive';
  roi: string;
  roiValue: number;
  allocation: number;
  tvl: string;
};

type Transaction = {
  id: string;
  farmId: string;
  farmName: string;
  type: 'Fund' | 'Withdraw';
  amount: string;
  timestamp: Date;
  status: 'Pending' | 'Completed' | 'Failed';
  txHash?: string;
};

export function FarmFunding() {
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('fund');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<SimpleFarmFundingErrorType>(SimpleFarmFundingErrorType.GENERIC);
  const [success, setSuccess] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({
    address: address,
  });

  // Mock farms data
  const farms: Farm[] = [
    { 
      id: 'farm1', 
      name: 'Alpha Strategy', 
      type: 'Momentum',
      riskLevel: 'Medium', 
      status: 'Active', 
      roi: '+12.3%', 
      roiValue: 12.3,
      allocation: 25,
      tvl: '32.5 ETH'
    },
    { 
      id: 'farm2', 
      name: 'Beta Harvester', 
      type: 'Mean Reversion',
      riskLevel: 'High', 
      status: 'Active', 
      roi: '+18.7%', 
      roiValue: 18.7,
      allocation: 40,
      tvl: '65.2 ETH'
    },
    { 
      id: 'farm3', 
      name: 'Stable Income', 
      type: 'Yield',
      riskLevel: 'Low', 
      status: 'Active', 
      roi: '+5.2%', 
      roiValue: 5.2,
      allocation: 35,
      tvl: '102.8 ETH'
    },
  ];

  // Load mock transactions
  useEffect(() => {
    const mockTransactions: Transaction[] = [
      {
        id: 'tx1',
        farmId: 'farm1',
        farmName: 'Alpha Strategy',
        type: 'Fund',
        amount: '0.5 ETH',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'Completed',
        txHash: '0x1234...5678'
      },
      {
        id: 'tx2',
        farmId: 'farm2',
        farmName: 'Beta Harvester',
        type: 'Fund',
        amount: '1.2 ETH',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'Completed',
        txHash: '0xabcd...efgh'
      },
      {
        id: 'tx3',
        farmId: 'farm3',
        farmName: 'Stable Income',
        type: 'Withdraw',
        amount: '0.3 ETH',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        status: 'Completed',
        txHash: '0x9876...5432'
      }
    ];
    
    setTransactions(mockTransactions);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    
    // Basic validation
    if (value && isNaN(Number(value))) {
      setAmountError('Please enter a valid number');
    } else if (Number(value) <= 0) {
      setAmountError('Amount must be greater than 0');
    } else if (balance && Number(value) > Number(balance.formatted)) {
      setAmountError('Insufficient balance');
      setErrorType(SimpleFarmFundingErrorType.INSUFFICIENT_BALANCE);
    } else {
      setAmountError(null);
    }
  };

  const handleFunding = async () => {
    if (!selectedFarm) {
      setError('Please select a farm to fund');
      setErrorType(SimpleFarmFundingErrorType.GENERIC);
      return;
    }
    
    if (!amount || amountError) {
      setError('Please enter a valid amount');
      setErrorType(SimpleFarmFundingErrorType.GENERIC);
      return;
    }
    
    if (!isConnected) {
      setError('Please connect your wallet first');
      setErrorType(SimpleFarmFundingErrorType.GENERIC);
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, this would call a smart contract function
      const farm = farms.find(f => f.id === selectedFarm);
      
      // Add to transaction history
      const newTransaction: Transaction = {
        id: `tx${Math.random().toString(36).substring(2, 11)}`,
        farmId: selectedFarm,
        farmName: farm ? farm.name : 'Unknown Farm',
        type: activeTab === 'fund' ? 'Fund' : 'Withdraw',
        amount: `${amount} ETH`,
        timestamp: new Date(),
        status: 'Completed',
        txHash: `0x${Math.random().toString(36).substring(2, 14)}...${Math.random().toString(36).substring(2, 6)}`
      };
      
      setTransactions(prev => [newTransaction, ...prev]);
      
      setSuccess(`Successfully ${activeTab === 'fund' ? 'funded' : 'withdrew from'} ${farm?.name}!`);
      setAmount('');
      setSelectedFarm(null);
    } catch (err) {
      setError(`Transaction failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setErrorType(SimpleFarmFundingErrorType.TRANSACTION_FAILED);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset success/error messages when tab changes
  useEffect(() => {
    setError(null);
    setSuccess(null);
    setAmount('');
    setSelectedFarm(null);
  }, [activeTab]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [success]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Landmark className="mr-2 h-5 w-5" />
          Farm Funding
        </CardTitle>
        <CardDescription>
          Fund your trading farms or withdraw your earnings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <Alert className="bg-muted/50">
            <Wallet className="h-4 w-4" />
            <AlertTitle>Wallet Required</AlertTitle>
            <AlertDescription>
              Please connect your wallet to fund or withdraw from farms.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {error && (
              <SimpleFarmFundingError 
                type={SimpleFarmFundingErrorType.TRANSACTION_FAILED} 
                message={error}
              />
            )}
            
            {success && (
              <Alert className="bg-success/10 border-success/50 text-success">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="fund">Fund Farm</TabsTrigger>
                <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
              </TabsList>
              
              <TabsContent value="fund" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Select Farm</label>
                  <Select value={selectedFarm || ""} onValueChange={setSelectedFarm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a farm" />
                    </SelectTrigger>
                    <SelectContent>
                      {farms.map(farm => (
                        <SelectItem key={farm.id} value={farm.id}>
                          <div className="flex items-center">
                            <span>{farm.name}</span>
                            <Badge className="ml-2" variant={
                              farm.riskLevel === 'Low' ? 'outline' : 
                              farm.riskLevel === 'Medium' ? 'secondary' : 
                              'destructive'
                            }>
                              {farm.riskLevel}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedFarm && (
                  <div className="rounded-md bg-muted/40 p-3">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Farm Type:</span>
                        <span className="font-medium">{farms.find(f => f.id === selectedFarm)?.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ROI (30d):</span>
                        <span className="font-medium text-success">{farms.find(f => f.id === selectedFarm)?.roi}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Value Locked:</span>
                        <span className="font-medium">{farms.find(f => f.id === selectedFarm)?.tvl}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="block text-sm font-medium">Amount (ETH)</label>
                    {balance && (
                      <span className="text-xs text-muted-foreground">
                        Balance: {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                      </span>
                    )}
                  </div>
                  <Input 
                    type="text" 
                    placeholder="0.0" 
                    value={amount} 
                    onChange={handleInputChange}
                    className={amountError ? "border-destructive" : ""}
                  />
                  {amountError && <p className="text-xs text-destructive">{amountError}</p>}
                </div>
                
                <div className="pt-2">
                  <Button
                    onClick={handleFunding}
                    disabled={!selectedFarm || !amount || !!amountError || isSubmitting || !isConnected}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                        Fund Farm
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="withdraw" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Select Farm</label>
                  <Select value={selectedFarm || ""} onValueChange={setSelectedFarm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a farm" />
                    </SelectTrigger>
                    <SelectContent>
                      {farms.map(farm => (
                        <SelectItem key={farm.id} value={farm.id}>
                          <div className="flex items-center">
                            <span>{farm.name}</span>
                            <Badge className="ml-2" variant={
                              farm.riskLevel === 'Low' ? 'outline' : 
                              farm.riskLevel === 'Medium' ? 'secondary' : 
                              'destructive'
                            }>
                              {farm.riskLevel}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedFarm && (
                  <div className="rounded-md bg-muted/40 p-3">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Available to Withdraw:</span>
                        <span className="font-medium">0.85 ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profit/Loss:</span>
                        <span className="font-medium text-success">+0.17 ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lock Period:</span>
                        <span className="font-medium">None</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Amount (ETH)</label>
                  <Input 
                    type="text" 
                    placeholder="0.0" 
                    value={amount} 
                    onChange={handleInputChange}
                    className={amountError ? "border-destructive" : ""}
                  />
                  {amountError && <p className="text-xs text-destructive">{amountError}</p>}
                </div>
                
                <div className="pt-2">
                  <Button
                    onClick={handleFunding}
                    disabled={!selectedFarm || !amount || !!amountError || isSubmitting || !isConnected}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="mr-2 h-4 w-4" />
                        Withdraw
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}

        <Separator className="my-4" />
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium flex items-center">
              <Activity className="mr-2 h-4 w-4" />
              Transaction History
            </h3>
          </div>
          
          {transactions.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Farm</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 5).map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <span className={`flex items-center ${tx.type === 'Fund' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {tx.type === 'Fund' ? (
                            <ArrowUpRight className="mr-1 h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="mr-1 h-3 w-3" />
                          )}
                          {tx.type}
                        </span>
                      </TableCell>
                      <TableCell>{tx.farmName}</TableCell>
                      <TableCell>{tx.amount}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(tx.timestamp)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          tx.status === 'Completed' ? 'default' : 
                          tx.status === 'Pending' ? 'outline' : 
                          'destructive'
                        }>
                          {tx.status === 'Pending' && <Clock className="mr-1 h-3 w-3" />}
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tx.txHash && (
                          <a 
                            href={`https://etherscan.io/tx/${tx.txHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center text-sm"
                          >
                            {tx.txHash.substring(0, 6)}...{tx.txHash.substring(tx.txHash.length - 4)}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-md">
              <p>No transactions found</p>
            </div>
          )}
          
          {transactions.length > 5 && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" size="sm" className="text-sm">
                View All Transactions
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
