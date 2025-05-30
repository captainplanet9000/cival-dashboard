/**
 * Trading Farm Multi-Chain Integration
 * MultichainBridge - Component for bridging assets between chains
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ArrowRight, RefreshCcw, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWallet } from '../wallets/UnifiedWalletConnector';

// Chain configuration
const CHAIN_CONFIG = {
  evm: { name: 'Ethereum', icon: '🔷', color: '#627EEA' },
  sonic: { name: 'Sonic', icon: '⚡', color: '#0A6EBD' },
  sui: { name: 'Sui', icon: '🔵', color: '#6FBCF0' },
  solana: { name: 'Solana', icon: '🟣', color: '#9945FF' },
};

// Asset configuration
const ASSETS_BY_CHAIN = {
  evm: [
    { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { symbol: 'WETH', name: 'Wrapped ETH', decimals: 18 },
    { symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8 },
  ],
  sonic: [
    { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { symbol: 'WETH', name: 'Wrapped ETH', decimals: 18 },
  ],
  sui: [
    { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { symbol: 'SUI', name: 'Sui', decimals: 9 },
  ],
  solana: [
    { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { symbol: 'SOL', name: 'Solana', decimals: 9 },
  ],
};

// Bridge provider configuration
const BRIDGE_PROVIDERS = [
  { id: 'layerzero', name: 'LayerZero', supportedChains: ['evm', 'sonic', 'sui'] },
  { id: 'wormhole', name: 'Wormhole', supportedChains: ['evm', 'solana', 'sui'] },
  { id: 'sonic-gateway', name: 'Sonic Gateway', supportedChains: ['evm', 'sonic'] },
];

interface BridgeQuote {
  sourceAmount: string;
  destinationAmount: string;
  fee: string;
  feeToken: string;
  estimatedTime: string;
  provider: string;
}

export function MultichainBridge({ vaultId }: { vaultId: string }) {
  const { walletState } = useWallet();
  const { toast } = useToast();
  
  // Form state
  const [sourceChain, setSourceChain] = useState('evm');
  const [destChain, setDestChain] = useState('sonic');
  const [selectedAsset, setSelectedAsset] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quotes, setQuotes] = useState<BridgeQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<BridgeQuote | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  
  // Filtered assets based on selected source chain
  const availableAssets = ASSETS_BY_CHAIN[sourceChain as keyof typeof ASSETS_BY_CHAIN] || [];
  
  // Available providers based on chain selection
  const availableProviders = BRIDGE_PROVIDERS.filter(
    provider => provider.supportedChains.includes(sourceChain) && provider.supportedChains.includes(destChain)
  );
  
  // Handle source chain change
  const handleSourceChainChange = (value: string) => {
    setSourceChain(value);
    // If destination chain is same as source, pick a different one
    if (value === destChain) {
      const otherChains = Object.keys(CHAIN_CONFIG).filter(chain => chain !== value);
      if (otherChains.length > 0) {
        setDestChain(otherChains[0]);
      }
    }
    
    // Reset selections if needed
    if (!ASSETS_BY_CHAIN[value as keyof typeof ASSETS_BY_CHAIN]?.some(asset => asset.symbol === selectedAsset)) {
      setSelectedAsset(ASSETS_BY_CHAIN[value as keyof typeof ASSETS_BY_CHAIN]?.[0]?.symbol || '');
    }
    
    setSelectedProvider('');
    setQuotes([]);
    setSelectedQuote(null);
  };
  
  // Handle destination chain change
  const handleDestChainChange = (value: string) => {
    setDestChain(value);
    setSelectedProvider('');
    setQuotes([]);
    setSelectedQuote(null);
  };
  
  // Get quotes
  const getQuotes = async () => {
    if (!sourceChain || !destChain || !selectedAsset || !amount || parseFloat(amount) <= 0) {
      setError('Please fill in all fields');
      return;
    }
    
    setIsQuoting(true);
    setError('');
    setQuotes([]);
    setSelectedQuote(null);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock bridge quotes - in production this would call the BridgeService
      const mockQuotes: BridgeQuote[] = [];
      
      // Generate quotes for each available provider
      availableProviders.forEach(provider => {
        // Add some variability to quotes
        const feePercent = provider.id === 'layerzero' ? 0.3 : 
                          provider.id === 'wormhole' ? 0.5 : 0.2;
        
        const amountNum = parseFloat(amount);
        const fee = amountNum * (feePercent / 100);
        const destinationAmount = (amountNum - fee).toFixed(6);
        
        mockQuotes.push({
          sourceAmount: amount,
          destinationAmount,
          fee: fee.toFixed(6),
          feeToken: selectedAsset,
          estimatedTime: provider.id === 'layerzero' ? '15 minutes' : 
                        provider.id === 'wormhole' ? '10 minutes' : '5 minutes',
          provider: provider.id
        });
      });
      
      setQuotes(mockQuotes);
      if (mockQuotes.length > 0) {
        setSelectedQuote(mockQuotes[0]);
        setSelectedProvider(mockQuotes[0].provider);
      }
    } catch (error) {
      console.error('Error getting quotes:', error);
      setError('Failed to get quotes. Please try again.');
    } finally {
      setIsQuoting(false);
    }
  };
  
  // Execute bridge transaction
  const executeBridge = async () => {
    if (!selectedQuote) return;
    
    setBridgeStatus('pending');
    setError('');
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, this would call the BridgeService to execute the bridge
      
      toast({
        title: "Bridge initiated",
        description: `Bridging ${amount} ${selectedAsset} from ${CHAIN_CONFIG[sourceChain as keyof typeof CHAIN_CONFIG]?.name} to ${CHAIN_CONFIG[destChain as keyof typeof CHAIN_CONFIG]?.name}`,
      });
      
      setBridgeStatus('success');
      
      // Reset form after successful bridge
      setTimeout(() => {
        setAmount('');
        setBridgeStatus('idle');
        setQuotes([]);
        setSelectedQuote(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error executing bridge:', error);
      setError('Failed to execute bridge. Please try again.');
      setBridgeStatus('error');
    }
  };
  
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Bridge Assets</CardTitle>
        <CardDescription>Transfer assets between chains</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Source Chain */}
        <div className="space-y-2">
          <Label htmlFor="source-chain">Source Chain</Label>
          <Select value={sourceChain} onValueChange={handleSourceChainChange}>
            <SelectTrigger id="source-chain">
              <SelectValue placeholder="Select source chain" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CHAIN_CONFIG).map(([slug, config]) => (
                <SelectItem key={slug} value={slug}>
                  <div className="flex items-center">
                    <span className="mr-2">{config.icon}</span>
                    <span>{config.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Destination Chain */}
        <div className="space-y-2">
          <Label htmlFor="dest-chain">Destination Chain</Label>
          <Select value={destChain} onValueChange={handleDestChainChange}>
            <SelectTrigger id="dest-chain">
              <SelectValue placeholder="Select destination chain" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CHAIN_CONFIG)
                .filter(([slug]) => slug !== sourceChain)
                .map(([slug, config]) => (
                  <SelectItem key={slug} value={slug}>
                    <div className="flex items-center">
                      <span className="mr-2">{config.icon}</span>
                      <span>{config.name}</span>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Asset */}
        <div className="space-y-2">
          <Label htmlFor="asset">Asset</Label>
          <Select 
            value={selectedAsset} 
            onValueChange={setSelectedAsset}
            disabled={availableAssets.length === 0}
          >
            <SelectTrigger id="asset">
              <SelectValue placeholder="Select asset" />
            </SelectTrigger>
            <SelectContent>
              {availableAssets.map((asset) => (
                <SelectItem key={asset.symbol} value={asset.symbol}>
                  <div className="flex items-center">
                    <span>{asset.symbol}</span>
                    <span className="ml-2 text-muted-foreground">({asset.name})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="flex items-center gap-2">
            <Input 
              id="amount"
              type="number"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setAmount('1000')}
              className="whitespace-nowrap"
            >
              Max
            </Button>
          </div>
        </div>
        
        {/* Provider Selection (shown after quotes) */}
        {quotes.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <Label>Bridge Provider</Label>
            <div className="grid gap-2">
              {quotes.map((quote) => {
                const provider = BRIDGE_PROVIDERS.find(p => p.id === quote.provider);
                return (
                  <div 
                    key={quote.provider}
                    className={`border rounded-md p-3 cursor-pointer transition ${
                      selectedQuote?.provider === quote.provider ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => {
                      setSelectedQuote(quote);
                      setSelectedProvider(quote.provider);
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{provider?.name}</h4>
                      <div className="text-sm text-muted-foreground">~{quote.estimatedTime}</div>
                    </div>
                    
                    <div className="mt-2 flex justify-between items-center">
                      <div className="text-sm">
                        <span className="font-medium">{quote.sourceAmount} {selectedAsset}</span>
                        <ArrowRight className="inline h-3 w-3 mx-1" />
                        <span className="font-medium">{quote.destinationAmount} {selectedAsset}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Fee: {quote.fee} {quote.feeToken}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {bridgeStatus === 'success' && (
          <Alert className="bg-green-500/10 text-green-500 border-green-500/20">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Bridge transaction initiated successfully!</AlertDescription>
          </Alert>
        )}
        
        {availableProviders.length === 0 && sourceChain && destChain && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No Available Routes</AlertTitle>
            <AlertDescription>
              There are no bridge providers available for the selected chains.
              Please select different chains.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col items-stretch gap-4">
        {quotes.length === 0 ? (
          <Button 
            className="w-full" 
            disabled={isQuoting || !sourceChain || !destChain || !selectedAsset || !amount || availableProviders.length === 0}
            onClick={getQuotes}
          >
            {isQuoting ? (
              <>
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                Getting Quotes...
              </>
            ) : (
              'Get Quotes'
            )}
          </Button>
        ) : (
          <Button 
            className="w-full"
            disabled={bridgeStatus === 'pending' || !selectedQuote}
            onClick={executeBridge}
          >
            {bridgeStatus === 'pending' ? (
              <>
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Bridge ${amount} ${selectedAsset}`
            )}
          </Button>
        )}
        
        <div className="text-xs text-center text-muted-foreground">
          All bridge transactions are secured by the Trading Farm multi-chain risk management system
        </div>
      </CardFooter>
    </Card>
  );
}
