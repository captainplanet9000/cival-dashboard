"use client";

import { useAccount, useBalance, useChainId } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, 
  ExternalLink, 
  Copy, 
  Check, 
  Layers, 
  ArrowUpRight, 
  AlertCircle, 
  BarChart4,
  Landmark
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatEther } from 'viem';
import { networkConfig } from '@/config/web3';
import { useState, useCallback } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface WalletDetailsProps {
  className?: string;
}

export function WalletDetails({ className = "" }: WalletDetailsProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { open } = useWeb3Modal();
  const [copied, setCopied] = useState(false);
  
  // Get balance data
  const { data: balanceData, isLoading: isBalanceLoading } = useBalance({
    address
  });

  // Network information from config
  const networkInfo = chainId ? networkConfig[chainId as keyof typeof networkConfig] : null;
  
  // Format address function
  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  // Copy address to clipboard
  const copyAddress = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  // View on explorer
  const viewOnExplorer = useCallback(() => {
    if (address && networkInfo) {
      window.open(`${networkInfo.explorerUrl}/address/${address}`, '_blank');
    }
  }, [address, networkInfo]);

  // If not connected, show connect card
  if (!isConnected || !address) {
    return (
      <Card className={`border border-border shadow-sm ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="mr-2 h-5 w-5" />
            Wallet Connection
          </CardTitle>
          <CardDescription>
            Connect your MetaMask wallet to manage your farms and strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="rounded-full bg-muted p-6 mb-4">
            <Wallet className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Wallet Connected</h3>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
            Connect your wallet to view your balance, fund trading farms, and manage your strategies.
          </p>
          <Button onClick={() => open()} className="gap-2">
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border border-border shadow-sm ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Wallet className="mr-2 h-5 w-5" />
            Connected Wallet
          </CardTitle>
          <Badge variant={networkInfo?.isTestnet ? "outline" : "default"} className="gap-1 font-normal">
            <Layers className="h-3 w-3" />
            {networkInfo?.name || 'Unknown Network'}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
          {formatAddress(address)}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-4 w-4 rounded-full" 
            onClick={copyAddress}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs defaultValue="assets" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="assets" className="space-y-4 pt-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                    <Landmark className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{networkInfo?.symbol || 'ETH'}</h4>
                    <p className="text-xs text-muted-foreground">Native Token</p>
                  </div>
                </div>
                {isBalanceLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <div className="text-right">
                    <h4 className="font-medium">
                      {balanceData ? parseFloat(formatEther(balanceData.value)).toFixed(4) : '0.0000'}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {balanceData?.symbol || networkInfo?.symbol || 'ETH'}
                    </p>
                  </div>
                )}
              </div>
              <Progress value={65} className="h-1" />
            </div>
            
            {networkInfo?.isTestnet && (
              <Alert className="bg-orange-100/50 dark:bg-orange-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Testnet Detected</AlertTitle>
                <AlertDescription>
                  You are connected to a testnet. Funds have no real value.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="actions" className="space-y-2 pt-4">
            <Button 
              variant="outline" 
              className="w-full justify-between" 
              onClick={viewOnExplorer}
            >
              View on Explorer 
              <ExternalLink className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => open({ view: 'Networks' })}
            >
              Switch Network 
              <Layers className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => open()}
            >
              Wallet Settings 
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t p-4">
        <Button variant="outline" className="gap-2" onClick={() => open({ view: 'Account' })}>
          <Wallet className="h-4 w-4" />
          Account Details
        </Button>
        <Button variant="default" className="gap-2">
          <BarChart4 className="h-4 w-4" />
          Fund Farms
        </Button>
      </CardFooter>
    </Card>
  );
}
