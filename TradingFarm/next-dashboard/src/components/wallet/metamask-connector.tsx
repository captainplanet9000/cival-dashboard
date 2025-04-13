"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useWallet } from '@/contexts/WalletContext'; // Import the context hook

/**
 * MetaMask connector component 
 * Displays wallet status and provides connect/disconnect buttons.
 * Logic is handled by WalletContext.
 */
export default function MetaMaskConnector() {
  // Get state and actions from the context
  const { 
    address,
    isConnected,
    balance,
    network,
    error,
    isConnecting,
    connectWallet,
    disconnectWallet,
    refreshBalance 
  } = useWallet();

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatBalance = (value: string | null) => {
    if (!value) return '0.00';
    // Ensure value is treated as a number for toFixed
    const numericValue = Number(value);
    if (isNaN(numericValue)) {
      return '0.00';
    }
    return numericValue.toFixed(4);
  };

  if (isConnecting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connecting to MetaMask...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isConnected && address) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              MetaMask Connected
            </CardTitle>
            <Badge variant="outline" className={network?.includes('Mainnet') ? 'bg-green-100' : 'bg-yellow-100'}>
              {network || 'Unknown Network'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          {error && (
            <Alert variant="destructive" className="mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Address</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <span className="font-mono">{formatAddress(address)}</span>
                      <a 
                        href={`https://etherscan.io/address/${address}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-1 text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View on Etherscan</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Balance</span>
              <div className="flex items-center">
                <span className="font-medium mr-1">{formatBalance(balance)} ETH</span>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={refreshBalance} 
                  className="text-muted-foreground hover:text-primary h-4 w-4 ml-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span className="sr-only">Refresh Balance</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button 
            variant="secondary" 
            className="w-full" 
            size="sm" 
            onClick={disconnectWallet} // Use disconnect from context
          >
            Disconnect
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Default state: Not connected
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Connect MetaMask</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your MetaMask wallet to access trading farms and strategies.
        </p>
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button 
          className="w-full" 
          onClick={connectWallet} // Use connect from context
          disabled={isConnecting} // Use isConnecting from context
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'} 
        </Button>
      </CardContent>
    </Card>
  );
}
