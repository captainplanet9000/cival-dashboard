'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Wallet, ChevronDown, ArrowDownToLine, ArrowUpFromLine, RotateCcw, ExternalLink } from 'lucide-react';

// MetaMask connection interface
type ConnectorState = {
  accounts: string[];
  chainId: number | null;
  isConnecting: boolean;
  error: Error | null;
  isConnected: boolean;
  balance: string;
  networkName: string;
};

// Mock supported networks
const SUPPORTED_NETWORKS = [
  { id: 1, name: 'Ethereum', native: 'ETH' },
  { id: 56, name: 'BNB Smart Chain', native: 'BNB' },
  { id: 137, name: 'Polygon', native: 'MATIC' },
  { id: 10, name: 'Optimism', native: 'ETH' },
  { id: 42161, name: 'Arbitrum', native: 'ETH' },
];

// Mock transaction history for demo
const MOCK_TRANSACTIONS = [
  { hash: '0x1234...5678', type: 'Deposit', amount: '0.5 ETH', status: 'confirmed', timestamp: new Date(Date.now() - 3600000) },
  { hash: '0x8765...4321', type: 'Farm Assignment', amount: '0.3 ETH', status: 'confirmed', timestamp: new Date(Date.now() - 86400000) },
  { hash: '0xabcd...efgh', type: 'Withdrawal', amount: '0.1 ETH', status: 'pending', timestamp: new Date(Date.now() - 1800000) },
];

// Function to format wallet address for display
const formatAddress = (address: string) => {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export default function MetaMaskConnector() {
  const [state, setState] = useState<ConnectorState>({
    accounts: [],
    chainId: null,
    isConnecting: false,
    error: null,
    isConnected: false,
    balance: '0',
    networkName: '',
  });

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState('');
  
  // Mock farms
  const farms = [
    { id: 'farm1', name: 'BTC/USDT Farm', strategy: 'Trend Following', balance: '0.25 ETH' },
    { id: 'farm2', name: 'ETH/USDT Farm', strategy: 'Mean Reversion', balance: '0.15 ETH' },
    { id: 'farm3', name: 'Multi-Pair Farm', strategy: 'Liquidity Arbitrage', balance: '0.10 ETH' },
  ];

  // Mock connecting to MetaMask
  const connectWallet = async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful connection
      const mockAddress = '0x7F101fE45e6649A6fB8F3F8B43ed03D353f2B90c';
      
      setState({
        accounts: [mockAddress],
        chainId: 1, // Ethereum Mainnet
        isConnecting: false,
        error: null,
        isConnected: true,
        balance: '1.2345',
        networkName: 'Ethereum',
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error : new Error('Failed to connect'),
      }));
    }
  };

  // Mock disconnecting wallet
  const disconnectWallet = () => {
    setState({
      accounts: [],
      chainId: null,
      isConnecting: false,
      error: null,
      isConnected: false,
      balance: '0',
      networkName: '',
    });
  };

  // Mock deposit functionality
  const handleDeposit = async () => {
    if (!depositAmount) return;
    
    setIsProcessing(true);
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    
    // Mock successful deposit
    window.alert(`Successfully deposited ${depositAmount} ETH to your Trading Farm account.`);
    setDepositAmount('');
  };

  // Mock withdraw functionality
  const handleWithdraw = async () => {
    if (!withdrawAmount) return;
    
    setIsProcessing(true);
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    
    // Mock successful withdrawal
    window.alert(`Successfully withdrew ${withdrawAmount} ETH from your Trading Farm account.`);
    setWithdrawAmount('');
  };

  // Mock farm assignment
  const handleAssignToFarm = async () => {
    if (!selectedFarm) return;
    
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    
    const farm = farms.find(f => f.id === selectedFarm);
    window.alert(`Successfully assigned funds to ${farm?.name}.`);
  };

  // Mock switching networks
  const switchNetwork = async (chainId: number) => {
    setState(prev => ({ ...prev, isConnecting: true }));
    
    // Simulate network switch delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const network = SUPPORTED_NETWORKS.find(net => net.id === chainId);
    if (network) {
      setState(prev => ({
        ...prev,
        chainId,
        networkName: network.name,
        isConnecting: false,
      }));
    }
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wallet className="mr-2 h-5 w-5" />
          MetaMask Integration
        </CardTitle>
        <CardDescription>
          Connect your MetaMask wallet to fund your Trading Farm
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!state.isConnected ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Button 
              onClick={connectWallet} 
              disabled={state.isConnecting}
              className="w-full max-w-xs"
              variant="default"
            >
              {state.isConnecting ? (
                <>
                  <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg 
                    className="mr-2 h-4 w-4" 
                    viewBox="0 0 35 33" 
                    width="35" 
                    height="33"
                  >
                    <path 
                      fill="#E17726" 
                      d="M32.958 1l-13.134 9.718 2.442-5.727z" 
                      stroke="#E17726" 
                      strokeWidth=".25" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2.663 1l13.017 9.809-2.325-5.818L2.663 1zM28.23 23.534l-3.495 5.338 7.483 2.06 2.143-7.283-6.131-.115zM1.273 23.65l2.13 7.282 7.47-2.06-3.481-5.339-6.119.116z"
                      fill="#E17726"
                      stroke="#E17726"
                      strokeWidth=".25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Connect MetaMask
                </>
              )}
            </Button>
            
            {state.error && (
              <p className="text-red-500 mt-2">{state.error.message}</p>
            )}
          </div>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="deposit">Deposit</TabsTrigger>
              <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="py-4">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Connected Account</p>
                  <p className="font-mono flex items-center">
                    {formatAddress(state.accounts[0])}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-2 h-6 w-6 p-0"
                      onClick={() => navigator.clipboard.writeText(state.accounts[0])}
                    >
                      <svg 
                        className="h-3 w-3" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2}
                        />
                      </svg>
                    </Button>
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Wallet Balance</p>
                  <p className="text-2xl font-bold">{state.balance} ETH</p>
                </div>
                
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Network</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="mt-1">
                      {state.networkName}
                    </Badge>
                    
                    <div className="relative">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center"
                      >
                        Switch Network
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                      
                      <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover z-10 hidden">
                        <div className="py-1">
                          {SUPPORTED_NETWORKS.map(network => (
                            <button
                              key={network.id}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-accent"
                              onClick={() => switchNetwork(network.id)}
                            >
                              {network.name} ({network.native})
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Trading Farm Balance</p>
                  <p className="text-2xl font-bold">0.5 ETH</p>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Farm Allocation</p>
                    {farms.map(farm => (
                      <div key={farm.id} className="flex items-center justify-between">
                        <span>{farm.name}</span>
                        <span>{farm.balance}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  onClick={disconnectWallet} 
                  className="w-full"
                >
                  Disconnect Wallet
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="deposit" className="py-4 space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="deposit-amount">Amount to Deposit (ETH)</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder="0.0"
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    min="0.001"
                    step="0.001"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: {state.balance} ETH
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="farm-selection">Assign to Farm (Optional)</Label>
                  <select
                    id="farm-selection"
                    value={selectedFarm}
                    onChange={e => setSelectedFarm(e.target.value)}
                    className="w-full p-2 rounded-md border border-input bg-background mt-1"
                  >
                    <option value="">Select a farm</option>
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>
                        {farm.name} - {farm.strategy}
                      </option>
                    ))}
                  </select>
                </div>
                
                <Button 
                  onClick={handleDeposit} 
                  disabled={!depositAmount || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="mr-2 h-4 w-4" />
                      Deposit to Trading Farm
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="withdraw" className="py-4 space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="withdraw-amount">Amount to Withdraw (ETH)</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="0.0"
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    min="0.001"
                    step="0.001"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available for withdrawal: 0.5 ETH
                  </p>
                </div>
                
                <Button 
                  onClick={handleWithdraw} 
                  disabled={!withdrawAmount || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowUpFromLine className="mr-2 h-4 w-4" />
                      Withdraw to Wallet
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="py-4">
              <div className="space-y-4">
                <div className="relative overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Amount</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Time</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_TRANSACTIONS.map((tx, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-4 py-3">{tx.type}</td>
                          <td className="px-4 py-3">{tx.amount}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={tx.status === 'confirmed' ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : ""}>
                              {tx.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {tx.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between text-xs text-muted-foreground">
        <p>Transactions may take a few minutes to process</p>
        <p>Gas fees apply to all transactions</p>
      </CardFooter>
    </Card>
  );
}
