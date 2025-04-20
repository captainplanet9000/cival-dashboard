"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { ArrowRightIcon, RefreshCwIcon, AlertCircleIcon, CheckCircleIcon, Loader2Icon } from 'lucide-react';
import { useAccount } from 'wagmi';
import { bridgeService, ChainInfo, TokenInfo } from '@/services/bridge-service';

interface BridgePanelProps {
  className?: string;
}

export function BridgePanel({ className }: BridgePanelProps) {
  const { address } = useAccount();
  const { toast } = useToast();
  
  // State for form values
  const [fromChain, setFromChain] = useState<string>('1'); // Ethereum mainnet by default
  const [toChain, setToChain] = useState<string>('42161'); // Arbitrum by default
  const [token, setToken] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  
  // State for loading/data
  const [chains, setChains] = useState<ChainInfo[]>([]);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [executionLoading, setExecutionLoading] = useState<boolean>(false);
  
  // State for quote results
  const [fee, setFee] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [hasQuote, setHasQuote] = useState<boolean>(false);
  
  // State for transaction status
  const [txHash, setTxHash] = useState<string>('');
  const [txStatus, setTxStatus] = useState<string>('');
  
  // Load chains on mount
  useEffect(() => {
    const loadChains = async () => {
      setIsLoading(true);
      try {
        const supportedChains = await bridgeService.getSupportedChains();
        setChains(supportedChains);
        
        // Default chains are loaded, now load default tokens
        if (supportedChains.length > 0) {
          const fromChainId = parseInt(fromChain);
          const popularTokens = await bridgeService.getPopularTokens(fromChainId);
          setTokens(popularTokens);
          
          // Set default token if available
          if (popularTokens.length > 0) {
            setToken(popularTokens[0].address);
          }
        }
      } catch (error) {
        console.error('Error loading chains:', error);
        toast({
          title: 'Error',
          description: 'Failed to load supported chains',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadChains();
  }, [toast]); 
  
  // Load tokens when chain changes
  useEffect(() => {
    const loadTokens = async () => {
      if (!fromChain) return;
      
      try {
        const fromChainId = parseInt(fromChain);
        const popularTokens = await bridgeService.getPopularTokens(fromChainId);
        setTokens(popularTokens);
        
        // Reset token selection if current token is not available on new chain
        if (token && !popularTokens.some(t => t.address === token)) {
          if (popularTokens.length > 0) {
            setToken(popularTokens[0].address);
          } else {
            setToken('');
          }
        }
      } catch (error) {
        console.error('Error loading tokens:', error);
      }
    };
    
    loadTokens();
  }, [fromChain, token]);
  
  // Set recipient to current address initially
  useEffect(() => {
    if (address && !recipient) {
      setRecipient(address);
    }
  }, [address, recipient]);
  
  // Handle quote request
  const handleGetQuote = async () => {
    if (!fromChain || !toChain || !token || !amount || !address) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields to get a quote',
        variant: 'destructive',
      });
      return;
    }
    
    setQuoteLoading(true);
    setHasQuote(false);
    
    try {
      const quote = await bridgeService.getBridgeQuote({
        from_chain_id: parseInt(fromChain),
        to_chain_id: parseInt(toChain),
        token_address: token,
        amount,
        sender_address: address,
      });
      
      if (quote.success) {
        setFee(quote.fee);
        setEstimatedTime(quote.estimated_time);
        setHasQuote(true);
        
        toast({
          title: 'Quote received',
          description: `Fee: $${quote.fee}, Est. time: ${quote.estimated_time} minutes`,
        });
      } else {
        toast({
          title: 'Quote failed',
          description: quote.error || 'Failed to get quote',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error getting quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to get bridge quote',
        variant: 'destructive',
      });
    } finally {
      setQuoteLoading(false);
    }
  };
  
  // Handle execute bridge
  const handleExecuteBridge = async () => {
    if (!fromChain || !toChain || !token || !amount || !address || !recipient) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields to execute the bridge',
        variant: 'destructive',
      });
      return;
    }
    
    if (!hasQuote) {
      toast({
        title: 'Missing quote',
        description: 'Please get a quote first',
        variant: 'destructive',
      });
      return;
    }
    
    setExecutionLoading(true);
    
    try {
      const execution = await bridgeService.executeBridge({
        from_chain_id: parseInt(fromChain),
        to_chain_id: parseInt(toChain),
        token_address: token,
        amount,
        sender_address: address,
        recipient_address: recipient,
      });
      
      if (execution.success && execution.tx_hash) {
        setTxHash(execution.tx_hash);
        setTxStatus('pending');
        
        toast({
          title: 'Bridge initiated',
          description: `Transaction hash: ${execution.tx_hash.substring(0, 8)}...`,
        });
        
        // Start polling for status
        pollTransactionStatus(execution.tx_hash, parseInt(fromChain));
      } else {
        toast({
          title: 'Bridge failed',
          description: execution.error || 'Failed to execute bridge',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error executing bridge:', error);
      toast({
        title: 'Error',
        description: 'Failed to execute bridge transaction',
        variant: 'destructive',
      });
    } finally {
      setExecutionLoading(false);
    }
  };
  
  // Poll for transaction status
  const pollTransactionStatus = async (hash: string, fromChainId: number) => {
    const checkStatus = async () => {
      try {
        const status = await bridgeService.getBridgeStatus({
          tx_hash: hash,
          from_chain_id: fromChainId,
        });
        
        setTxStatus(status.status);
        
        if (status.status === 'completed') {
          toast({
            title: 'Bridge completed',
            description: 'Your assets have been transferred successfully',
          });
          return true;
        } else if (status.status === 'failed') {
          toast({
            title: 'Bridge failed',
            description: status.error || 'Transaction failed',
            variant: 'destructive',
          });
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('Error checking status:', error);
        return false;
      }
    };
    
    // Check immediately
    const isDone = await checkStatus();
    if (!isDone) {
      // Poll every 15 seconds
      const interval = setInterval(async () => {
        const isDone = await checkStatus();
        if (isDone) {
          clearInterval(interval);
        }
      }, 15000);
      
      // Clear interval after 10 minutes if it's still running
      setTimeout(() => clearInterval(interval), 600000);
    }
  };
  
  // Handle swap chains
  const handleSwapChains = () => {
    setFromChain(toChain);
    setToChain(fromChain);
    setHasQuote(false);
  };
  
  // Get token name by address
  const getTokenName = (address: string) => {
    const token = tokens.find(t => t.address === address);
    return token ? token.symbol : 'Token';
  };
  
  // Get chain name by id
  const getChainName = (id: string) => {
    const chain = chains.find(c => c.id.toString() === id);
    return chain ? chain.name : 'Chain';
  };
  
  // Format time to human readable
  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours} hour${hours > 1 ? 's' : ''}${mins > 0 ? ` ${mins} min` : ''}`;
    }
  };
  
  // Render loading skeleton
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex justify-center my-2">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Cross-Chain Bridge</CardTitle>
        <CardDescription>
          Transfer assets between different blockchain networks powered by LayerZero
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* From Chain */}
        <div className="space-y-2">
          <Label htmlFor="fromChain">From</Label>
          <Select
            value={fromChain}
            onValueChange={setFromChain}
            disabled={executionLoading}
          >
            <SelectTrigger id="fromChain">
              <SelectValue placeholder="Select source chain" />
            </SelectTrigger>
            <SelectContent>
              {chains.map((chain) => (
                <SelectItem key={chain.id} value={chain.id.toString()}>
                  {chain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Swap Direction Button */}
        <div className="flex justify-center my-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwapChains}
            disabled={executionLoading}
            className="rounded-full"
          >
            <ArrowRightIcon className="h-4 w-4 rotate-90" />
          </Button>
        </div>
        
        {/* To Chain */}
        <div className="space-y-2">
          <Label htmlFor="toChain">To</Label>
          <Select
            value={toChain}
            onValueChange={setToChain}
            disabled={executionLoading}
          >
            <SelectTrigger id="toChain">
              <SelectValue placeholder="Select destination chain" />
            </SelectTrigger>
            <SelectContent>
              {chains.map((chain) => (
                <SelectItem
                  key={chain.id}
                  value={chain.id.toString()}
                  disabled={chain.id.toString() === fromChain}
                >
                  {chain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Token */}
        <div className="space-y-2">
          <Label htmlFor="token">Token</Label>
          <Select
            value={token}
            onValueChange={setToken}
            disabled={executionLoading || tokens.length === 0}
          >
            <SelectTrigger id="token">
              <SelectValue placeholder="Select token" />
            </SelectTrigger>
            <SelectContent>
              {tokens.map((token) => (
                <SelectItem key={token.address} value={token.address}>
                  {token.symbol} - {token.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="text"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={executionLoading}
          />
        </div>
        
        {/* Recipient */}
        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient</Label>
          <Input
            id="recipient"
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={executionLoading}
          />
        </div>
        
        {/* Quote Results */}
        {hasQuote && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Bridge Fee:</span>
              <span className="font-semibold">${fee}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm font-medium">Estimated Time:</span>
              <span className="font-semibold">{formatTime(estimatedTime)}</span>
            </div>
          </div>
        )}
        
        {/* Transaction Status */}
        {txHash && (
          <Alert className={txStatus === 'completed' ? 'bg-green-500/10 border-green-500/20' : 
                          txStatus === 'failed' ? 'bg-red-500/10 border-red-500/20' : 
                          'bg-yellow-500/10 border-yellow-500/20'}>
            {txStatus === 'completed' && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
            {txStatus === 'failed' && <AlertCircleIcon className="h-4 w-4 text-red-500" />}
            {txStatus === 'pending' && <Loader2Icon className="h-4 w-4 text-yellow-500 animate-spin" />}
            
            <AlertTitle>
              {txStatus === 'completed' ? 'Bridge Completed' : 
               txStatus === 'failed' ? 'Bridge Failed' : 
               'Bridge in Progress'}
            </AlertTitle>
            <AlertDescription className="mt-2 text-xs font-mono break-all">
              TX: {txHash}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          className="w-1/3"
          onClick={handleGetQuote}
          disabled={!fromChain || !toChain || !token || !amount || quoteLoading || executionLoading}
        >
          {quoteLoading ? (
            <>
              <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            'Get Quote'
          )}
        </Button>
        
        <Button
          className="w-2/3"
          onClick={handleExecuteBridge}
          disabled={!hasQuote || !recipient || executionLoading}
        >
          {executionLoading ? (
            <>
              <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Bridge {amount} {getTokenName(token)} from {getChainName(fromChain)} to {getChainName(toChain)}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
