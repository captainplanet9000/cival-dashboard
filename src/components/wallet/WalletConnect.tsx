"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { WalletEvents, walletService } from '@/services/wallet-service';

// Define types locally if they don't exist in the project
interface TokenBalance {
  name: string;
  symbol: string;
  balance: string | number;
  decimals: number;
}

interface WalletInfo {
  address: string;
  connected: boolean;
  networkName: string;
  networkId: number;
}

// Add ethereum property to Window interface
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Add utility functions if they don't exist
const formatCryptoAddress = (address: string): string => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

const formatTokenAmount = (amount: string | number, decimals = 4): string => {
  if (typeof amount === 'string') {
    return parseFloat(amount).toFixed(decimals);
  }
  return amount.toFixed(decimals);
};

export function WalletConnect() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if wallet is already connected
    const currentWallet = walletService.wallet;
    if (currentWallet) {
      setWallet(currentWallet);
      loadBalances(currentWallet.address);
    } else {
      setIsLoading(false);
    }

    // Subscribe to wallet change events
    const handleWalletChanged = (walletInfo: WalletInfo | null) => {
      setWallet(walletInfo);
      
      if (walletInfo && walletInfo.connected) {
        loadBalances(walletInfo.address);
      } else {
        setBalances([]);
      }
    };

    // Subscribe to balance change events
    const handleBalanceChanged = (tokenBalances: TokenBalance[]) => {
      setBalances(tokenBalances);
    };

    // Register event listeners
    walletService.on(WalletEvents.WALLET_CHANGED, handleWalletChanged);
    walletService.on(WalletEvents.BALANCE_CHANGED, handleBalanceChanged);

    // Cleanup function to remove event listeners
    return () => {
      walletService.off(WalletEvents.WALLET_CHANGED, handleWalletChanged);
      walletService.off(WalletEvents.BALANCE_CHANGED, handleBalanceChanged);
    };
  }, []);

  // Load balances for the connected wallet
  const loadBalances = async (address: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const tokenBalances = await walletService.fetchTokenBalances(address);
      setBalances(tokenBalances);
    } catch (err) {
      console.error('Failed to load balances:', err);
      setError('Failed to load wallet balances');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle connect wallet button click
  const handleConnectWallet = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await walletService.connect('metamask');
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError('Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle disconnect wallet button click
  const handleDisconnectWallet = () => {
    try {
      walletService.disconnect();
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
      setError('Failed to disconnect wallet');
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </Card>
    );
  }

  // Render wallet connected state
  if (wallet && wallet.connected) {
    return (
      <Card className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Connected Wallet</h3>
              <p className="text-sm text-muted-foreground">{formatCryptoAddress(wallet.address)}</p>
            </div>
            <Badge>{wallet.networkName}</Badge>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Balances</h4>
            {balances.length > 0 ? (
              <ul className="space-y-1">
                {balances.map((token) => (
                  <li key={token.symbol} className="flex justify-between text-sm">
                    <span>{token.name}</span>
                    <span className="font-medium">{formatTokenAmount(token.balance)} {token.symbol}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No token balances found</p>
            )}
          </div>

          <Button onClick={handleDisconnectWallet}>
            Disconnect
          </Button>
        </div>
      </Card>
    );
  }

  // Render wallet not connected state
  return (
    <Card className="p-4">
      <div className="flex flex-col space-y-4">
        <h3 className="text-lg font-medium">Connect Wallet</h3>
        <p className="text-sm text-muted-foreground">
          Connect your wallet to access trading features and manage your funds.
        </p>
        
        {error && <p className="text-sm text-destructive">{error}</p>}
        
        <Button onClick={handleConnectWallet}>
          Connect Wallet
        </Button>
      </div>
    </Card>
  );
} 