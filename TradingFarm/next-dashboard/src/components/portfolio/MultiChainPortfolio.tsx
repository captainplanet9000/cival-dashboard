/**
 * Trading Farm Multi-Chain Integration
 * MultiChainPortfolio - Component for displaying assets across multiple chains
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, RefreshCcw, Wallet, Activity, Layers, Info } from 'lucide-react';
import { useWallet } from '../wallets/UnifiedWalletConnector';
import { ChainPositionSummary, VaultRiskSummary } from '@/services/risk/risk-types';
import { BridgeAsset } from '@/services/bridge/bridge-provider-interface';

interface Asset {
  chainSlug: string;
  address: string;
  symbol: string;
  name: string;
  amount: string;
  usdValue: number;
  priceUsd: number;
  change24h: number;
  iconUrl?: string;
}

interface ChainAssets {
  chainSlug: string;
  chainName: string;
  totalValue: number;
  assets: Asset[];
}

// Chain configuration with colors
const CHAIN_CONFIG = {
  evm: { name: 'Ethereum', color: '#627EEA', icon: '🔷' },
  sonic: { name: 'Sonic', color: '#0A6EBD', icon: '⚡' },
  sui: { name: 'Sui', color: '#6FBCF0', icon: '🔵' },
  solana: { name: 'Solana', color: '#9945FF', icon: '🟣' }
};

// Mock data for development - would be fetched from API in production
const MOCK_ASSETS: ChainAssets[] = [
  {
    chainSlug: 'evm',
    chainName: 'Ethereum',
    totalValue: 25750.45,
    assets: [
      {
        chainSlug: 'evm',
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        name: 'USD Coin',
        amount: '15000',
        usdValue: 15000,
        priceUsd: 1,
        change24h: 0,
        iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png'
      },
      {
        chainSlug: 'evm',
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        symbol: 'WETH',
        name: 'Wrapped Ether',
        amount: '5.2',
        usdValue: 10400,
        priceUsd: 2000,
        change24h: 2.5,
        iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png'
      },
      {
        chainSlug: 'evm',
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        symbol: 'WBTC',
        name: 'Wrapped Bitcoin',
        amount: '0.01',
        usdValue: 350.45,
        priceUsd: 35045,
        change24h: 1.2,
        iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png'
      }
    ]
  },
  {
    chainSlug: 'sonic',
    chainName: 'Sonic',
    totalValue: 12500,
    assets: [
      {
        chainSlug: 'sonic',
        address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        symbol: 'USDC',
        name: 'USD Coin',
        amount: '7500',
        usdValue: 7500,
        priceUsd: 1,
        change24h: 0,
        iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png'
      },
      {
        chainSlug: 'sonic',
        address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        symbol: 'WETH',
        name: 'Wrapped Ether',
        amount: '2.5',
        usdValue: 5000,
        priceUsd: 2000,
        change24h: 2.5,
        iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png'
      }
    ]
  },
  {
    chainSlug: 'sui',
    chainName: 'Sui',
    totalValue: 8250,
    assets: [
      {
        chainSlug: 'sui',
        address: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
        symbol: 'USDC',
        name: 'USD Coin',
        amount: '5000',
        usdValue: 5000,
        priceUsd: 1,
        change24h: 0,
        iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png'
      },
      {
        chainSlug: 'sui',
        address: '0x0000000000000000000000000000000000000000::sui::SUI',
        symbol: 'SUI',
        name: 'Sui',
        amount: '1000',
        usdValue: 3250,
        priceUsd: 3.25,
        change24h: 5.5,
        iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sui/info/logo.png'
      }
    ]
  },
  {
    chainSlug: 'solana',
    chainName: 'Solana',
    totalValue: 6500,
    assets: [
      {
        chainSlug: 'solana',
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        name: 'USD Coin',
        amount: '2500',
        usdValue: 2500,
        priceUsd: 1,
        change24h: 0,
        iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png'
      },
      {
        chainSlug: 'solana',
        address: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        amount: '100',
        usdValue: 4000,
        priceUsd: 40,
        change24h: 4.2,
        iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png'
      }
    ]
  }
];

export function MultiChainPortfolio({ vaultId }: { vaultId: string }) {
  const { walletState } = useWallet();
  const [assets, setAssets] = useState<ChainAssets[]>(MOCK_ASSETS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [riskSummary, setRiskSummary] = useState<VaultRiskSummary | null>(null);
  
  // Calculate total portfolio value
  const totalValue = assets.reduce((sum, chain) => sum + chain.totalValue, 0);
  
  // Fetch asset data - would call API in production
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // In production, this would fetch real data from APIs
        // For now, we're using mock data
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set mock data
        setAssets(MOCK_ASSETS);
        
        // Set mock risk summary
        setRiskSummary({
          vaultId,
          totalUsdValue: totalValue.toString(),
          positionsByChain: assets.map(chain => ({
            chainSlug: chain.chainSlug,
            totalUsdValue: chain.totalValue.toString(),
            spotValue: (chain.totalValue * 0.8).toString(),
            loanValue: '0',
            borrowValue: '0',
            derivativeValue: (chain.totalValue * 0.2).toString(),
            supplyValue: '0'
          })),
          riskScore: 35,
          activeWarnings: 0,
          lastUpdated: new Date().toISOString()
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching portfolio data:', error);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [vaultId, totalValue]);
  
  // Prepare chart data
  const chainDistributionData = assets.map(chain => ({
    name: chain.chainName,
    value: chain.totalValue,
    color: CHAIN_CONFIG[chain.chainSlug as keyof typeof CHAIN_CONFIG]?.color
  }));
  
  // Filter assets based on selected chain
  const filteredAssets = selectedChain === 'all' 
    ? assets.flatMap(chain => chain.assets)
    : assets.find(chain => chain.chainSlug === selectedChain)?.assets || [];
  
  // Function to format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Multi-Chain Portfolio</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsLoading(true)}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          <CardDescription>Your assets across all chains</CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <div className="grid grid-cols-4 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-2xl font-bold">{formatCurrency(totalValue)}</h3>
                <p className="text-sm text-muted-foreground">Total value across {assets.length} chains</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {assets.map((chain) => (
                  <Card key={chain.chainSlug} className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <span className="mr-2 text-lg">{CHAIN_CONFIG[chain.chainSlug as keyof typeof CHAIN_CONFIG]?.icon}</span>
                          <h4 className="font-medium">{chain.chainName}</h4>
                        </div>
                        <Badge variant="outline" className="bg-background">
                          {((chain.totalValue / totalValue) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <p className="text-xl font-semibold">{formatCurrency(chain.totalValue)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{chain.assets.length} assets</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Distribution Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium mb-4">Chain Distribution</h4>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chainDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {chainDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(index) => chainDistributionData[index].name}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-4">Asset Allocation</h4>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={assets}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <XAxis dataKey="chainName" />
                        <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="totalValue" fill="#8884d8" name="Value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Asset List */}
      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
          
          <Tabs defaultValue="all" value={selectedChain} onValueChange={setSelectedChain}>
            <TabsList>
              <TabsTrigger value="all">All Chains</TabsTrigger>
              {assets.map((chain) => (
                <TabsTrigger key={chain.chainSlug} value={chain.chainSlug}>
                  {CHAIN_CONFIG[chain.chainSlug as keyof typeof CHAIN_CONFIG]?.icon} {chain.chainName}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No assets found</p>
                </div>
              ) : (
                filteredAssets.map((asset) => (
                  <div key={`${asset.chainSlug}-${asset.address}`} className="flex items-center justify-between p-4 border rounded-md">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mr-4">
                        {asset.iconUrl ? (
                          <img src={asset.iconUrl} alt={asset.symbol} className="h-6 w-6" />
                        ) : (
                          <div className="h-6 w-6 bg-primary rounded-full" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center">
                          <h4 className="font-medium">{asset.symbol}</h4>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {CHAIN_CONFIG[asset.chainSlug as keyof typeof CHAIN_CONFIG]?.icon} {asset.chainSlug.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{asset.name}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(asset.usdValue)}</div>
                      <div className="text-sm text-muted-foreground">{asset.amount} {asset.symbol}</div>
                      <div className={`text-xs flex items-center justify-end ${asset.change24h > 0 ? 'text-green-500' : asset.change24h < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {asset.change24h > 0 ? (
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                        ) : asset.change24h < 0 ? (
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                        ) : null}
                        {asset.change24h > 0 ? '+' : ''}{asset.change24h}%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter>
          <div className="flex items-center text-sm text-muted-foreground">
            <Info className="h-4 w-4 mr-2" />
            Showing {filteredAssets.length} assets {selectedChain !== 'all' ? `on ${CHAIN_CONFIG[selectedChain as keyof typeof CHAIN_CONFIG]?.name}` : 'across all chains'}
          </div>
        </CardFooter>
      </Card>
      
      {/* Risk Assessment Card */}
      {riskSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
            <CardDescription>Portfolio risk metrics and analysis</CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Risk Score</span>
                  <span className="text-sm font-medium">{riskSummary.riskScore}/100</span>
                </div>
                <Progress value={riskSummary.riskScore} className="h-2" />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-green-500">Low Risk</span>
                  <span className="text-xs text-yellow-500">Moderate</span>
                  <span className="text-xs text-red-500">High Risk</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/50 p-4 rounded-md">
                  <div className="flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Active Warnings</h4>
                  </div>
                  <p className="text-2xl font-bold mt-2">{riskSummary.activeWarnings}</p>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-md">
                  <div className="flex items-center">
                    <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Chain Diversification</h4>
                  </div>
                  <p className="text-2xl font-bold mt-2">{riskSummary.positionsByChain.length}</p>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-md">
                  <div className="flex items-center">
                    <Wallet className="h-4 w-4 mr-2 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Total Exposure</h4>
                  </div>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(parseFloat(riskSummary.totalUsdValue))}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
